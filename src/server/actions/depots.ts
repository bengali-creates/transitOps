"use server";

import { db } from "@/db";
import { depots, depotEdges } from "@/db/schema";
import { depotSchema, depotEdgeSchema } from "@/lib/validations";
import { invalidateCache } from "@/server/services/matrix-service";
import { eq } from "drizzle-orm";

export async function createDepot(formData: FormData) {
  try {
    const rawData = {
      name: formData.get("name"),
      region: formData.get("region"),
      latitude: formData.get("latitude"),
      longitude: formData.get("longitude"),
    };

    const parsed = depotSchema.parse(rawData);

    const [newDepot] = await db
      .insert(depots)
      .values({
        name: parsed.name,
        region: parsed.region,
        latitude: String(parsed.latitude),
        longitude: String(parsed.longitude),
      })
      .returning();

    invalidateCache();

    return { success: true, depot: newDepot };
  } catch (error: any) {
    console.error("Failed to create depot:", error);
    return { error: error.message || "Failed to create depot" };
  }
}

export async function createEdge(formData: FormData) {
  try {
    const rawData = {
      fromDepotId: formData.get("fromDepotId"),
      toDepotId: formData.get("toDepotId"),
      distanceKm: formData.get("distanceKm"),
      tollCost: formData.get("tollCost") || 0,
    };

    const parsed = depotEdgeSchema.parse(rawData);

    const [newEdge] = await db
      .insert(depotEdges)
      .values({
        fromDepotId: parsed.fromDepotId,
        toDepotId: parsed.toDepotId,
        distanceKm: String(parsed.distanceKm),
        tollCost: String(parsed.tollCost),
      })
      .returning();

    invalidateCache();

    return { success: true, edge: newEdge };
  } catch (error: any) {
    console.error("Failed to create edge:", error);
    return { error: error.message || "Failed to create edge" };
  }
}

export async function deleteEdge(edgeId: string) {
  try {
    await db.delete(depotEdges).where(eq(depotEdges.id, edgeId));

    // Cache invalidation step: Bumps internal matrix hash
    invalidateCache();

    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete edge:", error);
    return { error: error.message || "Failed to delete edge" };
  }
}

export async function listDepots() {
  try {
    return await db.select().from(depots).orderBy(depots.name);
  } catch (error: any) {
    console.error("Failed to list depots:", error);
    return [];
  }
}

export async function listEdges() {
  try {
    return await db.select().from(depotEdges);
  } catch (error: any) {
    console.error("Failed to list edges:", error);
    return [];
  }
}
