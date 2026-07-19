"use server";

import { db } from "@/db";
import { fuelLogs, vehicles } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { fuelLogSchema } from "@/lib/validations";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createFuelLog(data: unknown) {
  const { session } = await requirePermission("finance:write");
  const parsed = fuelLogSchema.parse(data);

  await db.insert(fuelLogs).values({
    vehicleId: parsed.vehicleId,
    tripId: parsed.tripId || null,
    liters: parsed.liters.toString(),
    cost: parsed.cost.toString(),
    odometer: parsed.odometer?.toString(),
    loggedDate: parsed.loggedDate,
    createdBy: session?.user?.id,
  });

  revalidatePath("/fuel");
  revalidatePath("/analytics");
}

export async function getFuelLogs({ pageParam = 0 }: { pageParam?: number } = {}) {
  await requirePermission("finance:read");
  const limit = 10;
  const offset = pageParam * limit;

  const data = await db
    .select({
      id: fuelLogs.id,
      liters: fuelLogs.liters,
      cost: fuelLogs.cost,
      loggedDate: fuelLogs.loggedDate,
      vehicleName: vehicles.registrationNumber,
    })
    .from(fuelLogs)
    .leftJoin(vehicles, eq(fuelLogs.vehicleId, vehicles.id))
    .orderBy(desc(fuelLogs.loggedDate))
    .limit(limit)
    .offset(offset);

  return {
    data,
    nextPage: data.length === limit ? pageParam + 1 : undefined,
  };
}
