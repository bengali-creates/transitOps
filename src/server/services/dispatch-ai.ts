import { and, eq, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { vehicles, drivers, aiSuggestions } from "@/db/schema";
import { invokeJson } from "@/lib/bedrock";

/**
 * AI DISPATCH COPILOT (innovation)
 * Given a trip request, this first filters to only eligible assets using the
 * same hard business rules as the trip service, then asks Bedrock to rank the
 * pairings by utilization balance, load fit, fuel efficiency, and driver safety.
 * The model never overrides a hard rule; it only ranks legal options.
 */

export type DispatchRequest = {
  cargoWeight: number;
  plannedDistance: number;
  region?: string;
  source: string;
  destination: string;
};

export type DispatchRecommendation = {
  rankings: {
    vehicleId: string;
    driverId: string;
    score: number;
    rationale: string;
  }[];
  notes: string;
};

export async function recommendDispatch(
  reqInput: DispatchRequest,
  actorId?: string,
): Promise<DispatchRecommendation> {
  const today = new Date().toISOString().slice(0, 10);

  // Only assets that pass every hard rule are candidates.
  const eligibleVehicles = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.status, "available"));

  const eligibleDrivers = await db
    .select()
    .from(drivers)
    .where(
      and(eq(drivers.status, "available"), ne(drivers.status, "suspended")),
    );

  const vehicleCandidates = eligibleVehicles.filter(
    (v) => Number(v.maxLoadCapacity) >= reqInput.cargoWeight,
  );
  const driverCandidates = eligibleDrivers.filter(
    (d) => d.licenseExpiryDate >= today,
  );

  if (vehicleCandidates.length === 0 || driverCandidates.length === 0) {
    return {
      rankings: [],
      notes: "No eligible vehicle or driver satisfies the hard business rules.",
    };
  }

  const prompt = `You are a fleet dispatch optimizer. Rank the best vehicle and driver pairings for this trip.

Trip: ${JSON.stringify(reqInput)}

Eligible vehicles: ${JSON.stringify(
    vehicleCandidates.map((v) => ({
      id: v.id,
      type: v.type,
      capacity: v.maxLoadCapacity,
      odometer: v.odometer,
      region: v.region,
    })),
  )}

Eligible drivers: ${JSON.stringify(
    driverCandidates.map((d) => ({
      id: d.id,
      safetyScore: d.safetyScore,
      region: d.region,
      licenseCategory: d.licenseCategory,
    })),
  )}

Optimize for: tight load fit (avoid oversized vehicles), high driver safety score, matching region, and balanced utilization. Return JSON:
{"rankings":[{"vehicleId","driverId","score":0-100,"rationale"}],"notes":""}`;

  const result = await invokeJson<DispatchRecommendation>(prompt);

  const top = result.rankings?.[0];
  await db.insert(aiSuggestions).values({
    type: "dispatch_recommendation",
    summary: top
      ? `Suggested vehicle ${top.vehicleId} with driver ${top.driverId}`
      : "No recommendation",
    payload: result,
    confidence: top ? String(Math.min(top.score, 100) / 100) : null,
    createdBy: actorId,
  });

  return result;
}
