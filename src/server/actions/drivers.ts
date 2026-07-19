"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { drivers } from "@/db/schema";
import { driverSchema } from "@/lib/validations";
import { requirePermission } from "@/lib/auth";

export async function createDriver(formData: FormData) {
  await requirePermission("driver:write");

  const parsed = driverSchema.parse(Object.fromEntries(formData));

  try {
    const [row] = await db
      .insert(drivers)
      .values({
        name: parsed.name,
        licenseNumber: parsed.licenseNumber,
        licenseCategory: parsed.licenseCategory,
        licenseExpiryDate: parsed.licenseExpiryDate,
        contactNumber: parsed.contactNumber,
        safetyScore: parsed.safetyScore,
        status: parsed.status,
        region: parsed.region,
      })
      .returning();

    revalidatePath("/drivers");
    return { success: true, data: row };
  } catch (error: any) {
    if (error.code === '23505') {
      return { success: false, error: "License number already exists." };
    }
    throw error;
  }
}

export async function updateDriver(id: string, formData: FormData) {
  await requirePermission("driver:write");
  const parsed = driverSchema.partial().parse(Object.fromEntries(formData));

  try {
    const [row] = await db
      .update(drivers)
      .set(parsed)
      .where(eq(drivers.id, id))
      .returning();

    revalidatePath("/drivers");
    return { success: true, data: row };
  } catch (error: any) {
    if (error.code === '23505') {
      return { success: false, error: "License number already exists." };
    }
    throw error;
  }
}

export async function updateDriverStatus(id: string, status: "available" | "on_trip" | "off_duty" | "suspended") {
  await requirePermission("driver:write");
  const [row] = await db
    .update(drivers)
    .set({ status })
    .where(eq(drivers.id, id))
    .returning();

  revalidatePath("/drivers");
  return { success: true, data: row };
}

export async function listDrivers({ pageParam = 0 }: { pageParam?: number } = {}) {
  await requirePermission("driver:read");
  const limit = 10;
  const offset = pageParam * limit;
  const data = await db.select().from(drivers).orderBy(drivers.createdAt).limit(limit).offset(offset);
  return {
    data,
    nextPage: data.length === limit ? pageParam + 1 : undefined,
  };
}
