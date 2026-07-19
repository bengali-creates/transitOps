"use server";

import { db } from "@/db";
import { expenses, vehicles, trips } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { expenseSchema } from "@/lib/validations";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createExpense(data: unknown) {
  const { session } = await requirePermission("finance:write");
  const parsed = expenseSchema.parse(data);

  await db.insert(expenses).values({
    vehicleId: parsed.vehicleId || null,
    tripId: parsed.tripId || null,
    type: parsed.type,
    amount: parsed.amount.toString(),
    description: parsed.description,
    incurredDate: parsed.incurredDate,
    createdBy: session?.user?.id,
  });

  revalidatePath("/expenses");
  revalidatePath("/analytics");
}

export async function getExpenses({ pageParam = 0 }: { pageParam?: number } = {}) {
  await requirePermission("finance:read");
  const limit = 10;
  const offset = pageParam * limit;

  const data = await db
    .select({
      id: expenses.id,
      type: expenses.type,
      amount: expenses.amount,
      description: expenses.description,
      incurredDate: expenses.incurredDate,
      vehicleName: vehicles.registrationNumber,
      tripNumber: trips.id, 
    })
    .from(expenses)
    .leftJoin(vehicles, eq(expenses.vehicleId, vehicles.id))
    .leftJoin(trips, eq(expenses.tripId, trips.id))
    .orderBy(desc(expenses.incurredDate))
    .limit(limit)
    .offset(offset);

  return {
    data,
    nextPage: data.length === limit ? pageParam + 1 : undefined,
  };
}
