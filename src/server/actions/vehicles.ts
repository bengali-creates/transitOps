"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { vehicleSchema } from "@/lib/validations";
import { requirePermission } from "@/lib/auth";

/**
 * Reference server action module. Copy this shape for drivers, fuel, expenses:
 * 1. requirePermission (RBAC guard, early throw)
 * 2. validate with Zod
 * 3. write via Drizzle
 * 4. revalidate the affected path
 * Status-changing operations (trips, maintenance) must go through the service
 * layer instead of writing status here.
 */

export async function createVehicle(formData: FormData) {
  await requirePermission("vehicle:write");

  const parsed = vehicleSchema.parse(Object.fromEntries(formData));

  try {
    const [row] = await db
      .insert(vehicles)
      .values({
        registrationNumber: parsed.registrationNumber,
        name: parsed.name,
        type: parsed.type,
        maxLoadCapacity: String(parsed.maxLoadCapacity),
        odometer: String(parsed.odometer),
        acquisitionCost: String(parsed.acquisitionCost),
        region: parsed.region,
        status: parsed.status,
      })
      .returning();

    revalidatePath("/vehicles");
    return { success: true, data: row };
  } catch (error: any) {
    if (error.code === '23505') {
      return { success: false, error: "Registration number already exists." };
    }
    throw error;
  }
}

export async function updateVehicle(id: string, formData: FormData) {
  await requirePermission("vehicle:write");
  const parsed = vehicleSchema.partial().parse(Object.fromEntries(formData));

  try {
    const [row] = await db
      .update(vehicles)
      .set({
        ...parsed,
        maxLoadCapacity:
          parsed.maxLoadCapacity != null
            ? String(parsed.maxLoadCapacity)
            : undefined,
        odometer: parsed.odometer != null ? String(parsed.odometer) : undefined,
        acquisitionCost:
          parsed.acquisitionCost != null
            ? String(parsed.acquisitionCost)
            : undefined,
      })
      .where(eq(vehicles.id, id))
      .returning();

    revalidatePath("/vehicles");
    return { success: true, data: row };
  } catch (error: any) {
    if (error.code === '23505') {
      return { success: false, error: "Registration number already exists." };
    }
    throw error;
  }
}

export async function retireVehicle(id: string) {
  await requirePermission("vehicle:write");
  await db.update(vehicles).set({ status: "retired" }).where(eq(vehicles.id, id));
  revalidatePath("/vehicles");
}

export async function listVehicles({pageParam=0,filter}:{pageParam?:number,filter?:string} = {}){
  await requirePermission("vehicle:read");
  const limit=10;
  const offset=pageParam*limit;
  const data=await db.select().from(vehicles).orderBy(vehicles.createdAt).limit(limit).offset(offset);
  return {
    data,
    nextPage:data.length===limit?pageParam+1:undefined,
  }}
