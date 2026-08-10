import { and, eq, sql } from "drizzle-orm";
import { txDb } from "@/db/tx";
import {
  trips,
  vehicles,
  drivers,
  statusHistory,
} from "@/db/schema";

export class ConcurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConcurrencyError";
  }
}

/**
 * Stable 32-bit string hashing helper for Postgres advisory locks.
 */
function hashStringToInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash | 0);
}

export type DispatchInput = {
  tripId: string;
  actorId?: string;
};

function isLicenseExpired(expiry: string): boolean {
  return new Date(expiry) < new Date();
}

export async function dispatchTrip({ tripId, actorId }: DispatchInput) {
  return txDb.transaction(async (tx) => {
    const [trip] = await tx.select().from(trips).where(eq(trips.id, tripId));
    if (!trip) throw new Error("Trip not found");
    if (trip.status !== "draft") {
      throw new Error(`Only draft trips can be dispatched (current: ${trip.status})`);
    }

    const vehicleLockId = hashStringToInt("vehicle_" + trip.vehicleId);
    const driverLockId = hashStringToInt("driver_" + trip.driverId);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${vehicleLockId});`);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${driverLockId});`);

    const [vehicle] = await tx
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, trip.vehicleId))
      .for("update");
    const [driver] = await tx
      .select()
      .from(drivers)
      .where(eq(drivers.id, trip.driverId))
      .for("update");

    if (!vehicle) throw new Error("Vehicle not found");
    if (!driver) throw new Error("Driver not found");

    if (vehicle.status === "retired" || vehicle.status === "in_shop") {
      throw new Error(`Vehicle is ${vehicle.status} and cannot be dispatched`);
    }
    if (vehicle.status === "on_trip") {
      throw new ConcurrencyError("Vehicle is already dispatched on another trip.");
    }
    if (driver.status === "suspended") {
      throw new Error("Driver is suspended and cannot be dispatched");
    }
    if (driver.status === "on_trip") {
      throw new ConcurrencyError("Driver is already dispatched on another trip.");
    }
    if (isLicenseExpired(driver.licenseExpiryDate)) {
      throw new Error("Driver license has expired");
    }
    if (Number(trip.cargoWeight) > Number(vehicle.maxLoadCapacity)) {
      throw new Error(
        `Cargo weight ${trip.cargoWeight} exceeds capacity ${vehicle.maxLoadCapacity}`,
      );
    }

    const now = new Date();

    await tx
      .update(trips)
      .set({ 
        status: "dispatched", 
        dispatchedAt: now, 
        startOdometer: vehicle.odometer,
        version: trip.version + 1 
      })
      .where(eq(trips.id, tripId));

    await tx
      .update(vehicles)
      .set({ status: "on_trip", version: vehicle.version + 1 })
      .where(eq(vehicles.id, vehicle.id));

    await tx
      .update(drivers)
      .set({ status: "on_trip", version: driver.version + 1 })
      .where(eq(drivers.id, driver.id));

    await tx.insert(statusHistory).values([
      {
        entityType: "trip",
        entityId: tripId,
        fromStatus: "draft",
        toStatus: "dispatched",
        reason: "Trip dispatched",
        triggeredBy: actorId,
      },
      {
        entityType: "vehicle",
        entityId: vehicle.id,
        fromStatus: vehicle.status,
        toStatus: "on_trip",
        reason: `Dispatched on trip ${tripId}`,
        triggeredBy: actorId,
      },
      {
        entityType: "driver",
        entityId: driver.id,
        fromStatus: driver.status,
        toStatus: "on_trip",
        reason: `Dispatched on trip ${tripId}`,
        triggeredBy: actorId,
      },
    ]);

    return { ok: true as const };
  });
}

export type CompleteInput = {
  tripId: string;
  finalOdometer: number;
  fuelConsumed: number;
  revenue?: number;
  actorId?: string;
};

export async function completeTrip({
  tripId,
  finalOdometer,
  fuelConsumed,
  revenue,
  actorId,
}: CompleteInput) {
  return txDb.transaction(async (tx) => {
    const [trip] = await tx.select().from(trips).where(eq(trips.id, tripId));
    if (!trip) throw new Error("Trip not found");
    if (trip.status !== "dispatched") {
      throw new Error("Only dispatched trips can be completed");
    }

    const [vehicle] = await tx
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, trip.vehicleId))
      .for("update");
    const [driver] = await tx
      .select()
      .from(drivers)
      .where(eq(drivers.id, trip.driverId))
      .for("update");

    if (!vehicle || !driver) throw new Error("Assets not found");

    const start = Number(trip.startOdometer ?? 0);
    if (finalOdometer < start) {
      throw new Error("Final odometer cannot be below start odometer");
    }
    const actualDistance = finalOdometer - start;
    const now = new Date();

    await tx
      .update(trips)
      .set({
        status: "completed",
        finalOdometer: String(finalOdometer),
        fuelConsumed: String(fuelConsumed),
        actualDistance: String(actualDistance),
        revenue: revenue != null ? String(revenue) : trip.revenue,
        completedAt: now,
        version: trip.version + 1,
      })
      .where(eq(trips.id, tripId));

    await tx
      .update(vehicles)
      .set({ status: "available", odometer: String(finalOdometer), version: vehicle.version + 1 })
      .where(eq(vehicles.id, trip.vehicleId));

    await tx
      .update(drivers)
      .set({ status: "available", version: driver.version + 1 })
      .where(eq(drivers.id, trip.driverId));

    await tx.insert(statusHistory).values([
      {
        entityType: "trip",
        entityId: tripId,
        fromStatus: "dispatched",
        toStatus: "completed",
        reason: "Trip completed",
        triggeredBy: actorId,
      },
      {
        entityType: "vehicle",
        entityId: trip.vehicleId,
        fromStatus: "on_trip",
        toStatus: "available",
        triggeredBy: actorId,
      },
      {
        entityType: "driver",
        entityId: trip.driverId,
        fromStatus: "on_trip",
        toStatus: "available",
        triggeredBy: actorId,
      },
    ]);

    return { ok: true as const, actualDistance };
  });
}

export async function cancelTrip({ tripId, actorId }: DispatchInput) {
  return txDb.transaction(async (tx) => {
    const [trip] = await tx.select().from(trips).where(eq(trips.id, tripId));
    if (!trip) throw new Error("Trip not found");
    if (trip.status === "completed" || trip.status === "cancelled") {
      throw new Error(`Cannot cancel a ${trip.status} trip`);
    }

    const wasDispatched = trip.status === "dispatched";
    const now = new Date();

    const [vehicle] = await tx
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, trip.vehicleId))
      .for("update");
    const [driver] = await tx
      .select()
      .from(drivers)
      .where(eq(drivers.id, trip.driverId))
      .for("update");

    await tx
      .update(trips)
      .set({ status: "cancelled", cancelledAt: now, version: trip.version + 1 })
      .where(eq(trips.id, tripId));

    if (wasDispatched && vehicle && driver) {
      await tx
        .update(vehicles)
        .set({ status: "available", version: vehicle.version + 1 })
        .where(and(eq(vehicles.id, trip.vehicleId), eq(vehicles.status, "on_trip")));
      await tx
        .update(drivers)
        .set({ status: "available", version: driver.version + 1 })
        .where(and(eq(drivers.id, trip.driverId), eq(drivers.status, "on_trip")));
    }

    await tx.insert(statusHistory).values({
      entityType: "trip",
      entityId: tripId,
      fromStatus: trip.status,
      toStatus: "cancelled",
      reason: "Trip cancelled",
      triggeredBy: actorId,
    });

    return { ok: true as const, assetsRestored: wasDispatched };
  });
}
