import { eq } from "drizzle-orm";
import { txDb } from "@/db/tx";
import { maintenanceLogs, vehicles, statusHistory, outbox } from "@/db/schema";

/**
 * MAINTENANCE SERVICE
 *  - Opening an active maintenance record sets the vehicle to in_shop, which
 *    removes it from the dispatch pool.
 *  - Closing maintenance restores the vehicle to available, unless it is retired.
 */

export type OpenMaintenanceInput = {
  vehicleId: string;
  type: string;
  description?: string;
  cost?: number;
  odometer?: number;
  actorId?: string;
};

export async function openMaintenance(input: OpenMaintenanceInput) {
  return txDb.transaction(async (tx) => {
    const [vehicle] = await tx
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, input.vehicleId));
    if (!vehicle) throw new Error("Vehicle not found");
    if (vehicle.status === "on_trip") {
      throw new Error("Vehicle is on a trip. Complete or cancel the trip first.");
    }
    if (vehicle.status === "retired") {
      throw new Error("Vehicle is retired");
    }

    const [record] = await tx
      .insert(maintenanceLogs)
      .values({
        vehicleId: input.vehicleId,
        type: input.type,
        description: input.description,
        cost: String(input.cost ?? 0),
        odometer: input.odometer != null ? String(input.odometer) : undefined,
        status: "open",
        createdBy: input.actorId,
      })
      .returning();

    await tx
      .update(vehicles)
      .set({ status: "in_shop" })
      .where(eq(vehicles.id, input.vehicleId));

    await tx.insert(statusHistory).values({
      entityType: "vehicle",
      entityId: input.vehicleId,
      fromStatus: vehicle.status,
      toStatus: "in_shop",
      reason: `Maintenance opened: ${input.type}`,
      triggeredBy: input.actorId,
    });

    await tx.insert(outbox).values({
      eventType: "maintenance_started",
      payload: { vehicleId: input.vehicleId, maintenanceId: record.id },
      idempotencyKey: `maintenance_started_${record.id}`,
    });

    return record;
  });
}

export async function closeMaintenance(id: string, actorId?: string) {
  return txDb.transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(maintenanceLogs)
      .where(eq(maintenanceLogs.id, id));
    if (!record) throw new Error("Maintenance record not found");
    if (record.status === "closed") throw new Error("Already closed");

    await tx
      .update(maintenanceLogs)
      .set({ status: "closed", closedAt: new Date() })
      .where(eq(maintenanceLogs.id, id));

    const [vehicle] = await tx
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, record.vehicleId));

    // Do not revive a retired vehicle.
    if (vehicle && vehicle.status !== "retired") {
      await tx
        .update(vehicles)
        .set({ status: "available" })
        .where(eq(vehicles.id, record.vehicleId));

      await tx.insert(statusHistory).values({
        entityType: "vehicle",
        entityId: record.vehicleId,
        fromStatus: "in_shop",
        toStatus: "available",
        reason: "Maintenance closed",
        triggeredBy: actorId,
      });

      await tx.insert(outbox).values({
        eventType: "maintenance_closed",
        payload: { vehicleId: record.vehicleId, maintenanceId: id },
        idempotencyKey: `maintenance_closed_${id}`,
      });
    }

    return { ok: true as const };
  });
}
