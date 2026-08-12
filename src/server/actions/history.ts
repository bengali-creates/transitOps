"use server";

import { db } from "@/db";
import { statusHistory } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { requirePermission } from "@/lib/auth";

export async function getEntityEvents(entityType: "trip" | "vehicle" | "driver", entityId: string) {
  await requirePermission(`${entityType}:read`);
  return db
    .select()
    .from(statusHistory)
    .where(
      and(
        eq(statusHistory.entityType, entityType),
        eq(statusHistory.entityId, entityId)
      )
    )
    .orderBy(asc(statusHistory.createdAt));
}
