"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { trips } from "@/db/schema";
import { tripCreateSchema, tripCompleteSchema } from "@/lib/validations";
import { requirePermission } from "@/lib/auth";
import {
  dispatchTrip,
  completeTrip,
  cancelTrip,
} from "@/server/services/trip-service";

/**
 * Trip actions never set status directly. Creation makes a draft; every
 * transition is delegated to trip-service so the business rules and the
 * status_history log stay in one place.
 */

export async function createTrip(formData: FormData) {
  const { session } = await requirePermission("trip:write");
  const parsed = tripCreateSchema.parse(Object.fromEntries(formData));

  const [row] = await db
    .insert(trips)
    .values({
      source: parsed.source,
      destination: parsed.destination,
      vehicleId: parsed.vehicleId,
      driverId: parsed.driverId,
      cargoWeight: String(parsed.cargoWeight),
      plannedDistance: String(parsed.plannedDistance),
      status: "draft",
      createdBy: session?.user?.id,
    })
    .returning();

  revalidatePath("/trips");
  return row;
}

export async function dispatchTripAction(tripId: string) {
  const { session } = await requirePermission("trip:write");
  const result = await dispatchTrip({ tripId, actorId: session?.user?.id });
  revalidatePath("/trips");
  revalidatePath("/dashboard");
  return result;
}

export async function completeTripAction(formData: FormData) {
  const { session } = await requirePermission("trip:write");
  const parsed = tripCompleteSchema.parse(Object.fromEntries(formData));
  const result = await completeTrip({ ...parsed, actorId: session?.user?.id });
  revalidatePath("/trips");
  revalidatePath("/dashboard");
  return result;
}

export async function cancelTripAction(tripId: string) {
  const { session } = await requirePermission("trip:write");
  const result = await cancelTrip({ tripId, actorId: session?.user?.id });
  revalidatePath("/trips");
  revalidatePath("/dashboard");
  return result;
}
