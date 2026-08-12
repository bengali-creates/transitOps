import { db } from "@/db";
import { statusHistory } from "@/db/schema";
import { and, eq, lte, asc } from "drizzle-orm";

export type TripProjectionState = {
  id: string;
  status: string;
  startOdometer: string | null;
  finalOdometer: string | null;
  fuelConsumed: string | null;
  actualDistance: string | null;
  revenue: string | null;
  updatedAt: Date | null;
};

export type VehicleProjectionState = {
  id: string;
  status: string;
  odometer: string;
  updatedAt: Date | null;
};

export type DriverProjectionState = {
  id: string;
  status: string;
  updatedAt: Date | null;
};


export function foldEvents(
  entityType: "trip" | "vehicle" | "driver",
  entityId: string,
  events: Array<typeof statusHistory.$inferSelect>
) {
  if (entityType === "trip") {
    const state: TripProjectionState = {
      id: entityId,
      status: "draft",
      startOdometer: null,
      finalOdometer: null,
      fuelConsumed: null,
      actualDistance: null,
      revenue: null,
      updatedAt: null,
    };

    for (const event of events) {
      state.status = event.toStatus;
      state.updatedAt = event.createdAt;
      
      const meta = event.metadata as any;
      if (meta) {
        if (meta.startOdometer !== undefined) state.startOdometer = String(meta.startOdometer);
        if (meta.finalOdometer !== undefined) state.finalOdometer = String(meta.finalOdometer);
        if (meta.fuelConsumed !== undefined) state.fuelConsumed = String(meta.fuelConsumed);
        if (meta.actualDistance !== undefined) state.actualDistance = String(meta.actualDistance);
        if (meta.revenue !== undefined) state.revenue = String(meta.revenue);
      }
    }
    return state;
  } else if (entityType === "vehicle") {
    const state: VehicleProjectionState = {
      id: entityId,
      status: "available",
      odometer: "0",
      updatedAt: null,
    };

    for (const event of events) {
      state.status = event.toStatus;
      state.updatedAt = event.createdAt;
      
      const meta = event.metadata as any;
      if (meta && meta.odometer !== undefined) {
        state.odometer = String(meta.odometer);
      }
    }
    return state;
  } else {
    const state: DriverProjectionState = {
      id: entityId,
      status: "available",
      updatedAt: null,
    };

    for (const event of events) {
      state.status = event.toStatus;
      state.updatedAt = event.createdAt;
    }
    return state;
  }
}

export async function reconstructAsOf(
  entityType: "trip" | "vehicle" | "driver",
  entityId: string,
  timestamp: Date
) {
  const events = await db
    .select()
    .from(statusHistory)
    .where(
      and(
        eq(statusHistory.entityType, entityType),
        eq(statusHistory.entityId, entityId),
        lte(statusHistory.createdAt, timestamp)
      )
    )
    .orderBy(asc(statusHistory.createdAt));

  return foldEvents(entityType, entityId, events);
}
