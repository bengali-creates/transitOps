"use server";

import { db } from "@/db";
import { settings } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

const settingsSchema = z.object({
  depotName: z.string().min(1, "Depot name is required"),
  currency: z.string().min(1, "Currency is required"),
  distanceUnit: z.string().min(1, "Distance unit is required"),
});

export async function getSettings() {
  await requirePermission("vehicle:read"); // Using vehicle:read as a base permission
  const data = await db.select().from(settings).limit(1);
  if (data.length === 0) {
    const [inserted] = await db
      .insert(settings)
      .values({})
      .returning();
    return inserted;
  }
  return data[0];
}

export async function updateSettings(formData: FormData) {
  await requirePermission("vehicle:write"); // Need admin/write access
  const data = {
    depotName: formData.get("depotName") as string,
    currency: formData.get("currency") as string,
    distanceUnit: formData.get("distanceUnit") as string,
  };

  const parsed = settingsSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Invalid data" };
  }

  const existing = await db.select().from(settings).limit(1);
  if (existing.length === 0) {
    await db.insert(settings).values({ ...parsed.data, updatedAt: new Date() });
  } else {
    await db
      .update(settings)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(settings.id, existing[0].id));
  }

  revalidatePath("/settings");
  revalidatePath("/"); // in case settings are used globally
  return { success: true };
}
