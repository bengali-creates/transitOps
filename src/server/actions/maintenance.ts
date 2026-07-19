"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { maintenanceSchema } from "@/lib/validations";
import { openMaintenance, closeMaintenance } from "@/server/services/maintenance-service";
import { db } from "@/db";
import { maintenanceLogs } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function createMaintenance(formData: FormData) {
  const { session } = await requirePermission("maintenance:write");

  const parsed = maintenanceSchema.parse(Object.fromEntries(formData));

  try {
    const record = await openMaintenance({
      ...parsed,
      actorId: session?.user?.id,
    });
    
    revalidatePath("/maintenance");
    return { success: true, data: record };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to open maintenance" };
  }
}

export async function finishMaintenance(id: string) {
  const { session } = await requirePermission("maintenance:write");

  try {
    await closeMaintenance(id, session?.user?.id);
    revalidatePath("/maintenance");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to close maintenance" };
  }
}

export async function listMaintenanceLogs({pageParam=0}: {pageParam?: number}) {
  await requirePermission("maintenance:read");
  const limit=10;
  const offset=pageParam*limit;
  const data = await db.query.maintenanceLogs.findMany({
    with: { vehicle: true },
    orderBy: [desc(maintenanceLogs.createdAt)],
    limit,
    offset,
  });
  return {
    data,
    nextPage: data.length === limit ? pageParam + 1 : undefined,
  };
}
