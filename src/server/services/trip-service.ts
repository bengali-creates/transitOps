import { and, eq } from "drizzle-orm";
import { txDb } from "@/db/tx";
import {
  trips,
  vehicles,
  drivers,
  statusHistory,
} from "@/db/schema";

/**
 * TRIP SERVICE
 * Every mandatory business rule around trips lives here, executed inside a
 * transaction so a vehicle, a driver, and a trip never end up in inconsistent
 * states. Server actions call these functions. They never mutate status directly.
 *
 * Rules enforced:
 *  - Retired / in_shop vehicles cannot be dispatched.
 *  - Suspended drivers or expired licenses cannot be dispatched.
 *  - A vehicle or driver already on_trip cannot be dispatched again.
 *  - Cargo weight must not exceed the vehicle max load capacity.
 *  - Dispatch sets vehicle and driver to on_trip.
 *  - Complete restores both to available.
 *  - Cancel (from dispatched) restores both to available.
 */

export type DispatchInput = {
  tripId: string;
  actorId?: string;
};

function isLicenseExpired(expiry: string): boolean {
  // expiry is a date string (YYYY-MM-DD)
  return new Date(expiry) < new Date();
}

export async function dispatchTrip({ tripId, actorId }: DispatchInput) {
  return txDb.transaction(async (tx) => {
    const [trip] = await tx.select().from(trips).where(eq(trips.id, tripId));
    if (!trip) throw new Error("Trip not found");
    if (trip.status !== "draft") {
      throw new Error(`Only draft trips can be dispatched (current: ${trip.status})`);
    }

    const [vehicle] = await tx
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, trip.vehicleId));
    const [driver] = await tx
      .select()
      .from(drivers)
      .where(eq(drivers.id, trip.driverId));

    if (!vehicle) throw new Error("Vehicle not found");
    if (!driver) throw new Error("Driver not found");

    // Guard clauses (early returns via thrown errors).
    if (vehicle.status === "retired" || vehicle.status === "in_shop") {
      throw new Error(`Vehicle is ${vehicle.status} and cannot be dispatched`);
    }
    if (vehicle.status === "on_trip") {
      throw new Error("Vehicle is already on a trip");
    }
    if (driver.status === "suspended") {
      throw new Error("Driver is suspended and cannot be dispatched");
    }
    if (driver.status === "on_trip") {
      throw new Error("Driver is already on a trip");
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
      .set({ status: "dispatched", dispatchedAt: now, startOdometer: vehicle.odometer })
      .where(eq(trips.id, tripId));

    await tx
      .update(vehicles)
      .set({ status: "on_trip" })
      .where(eq(vehicles.id, vehicle.id));

    await tx
      .update(drivers)
      .set({ status: "on_trip" })
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
      })
      .where(eq(trips.id, tripId));

    // Vehicle odometer advances to the final reading.
    await tx
      .update(vehicles)
      .set({ status: "available", odometer: String(finalOdometer) })
      .where(eq(vehicles.id, trip.vehicleId));

    await tx
      .update(drivers)
      .set({ status: "available" })
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

    await tx
      .update(trips)
      .set({ status: "cancelled", cancelledAt: now })
      .where(eq(trips.id, tripId));

    // Only restore assets if they were locked by dispatch.
    if (wasDispatched) {
      await tx
        .update(vehicles)
        .set({ status: "available" })
        .where(and(eq(vehicles.id, trip.vehicleId), eq(vehicles.status, "on_trip")));
      await tx
        .update(drivers)
        .set({ status: "available" })
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
