import { db } from "@/db";
import { vehicles, drivers, aiSuggestions } from "@/db/schema";
import { and, eq, gte, inArray, notInArray } from "drizzle-orm";
import { askGemini } from "@/lib/gemini";
import { auth } from "@/lib/auth";

export async function getDispatchRecommendations(cargoWeight: number, targetRegion: string) {
  const session = await auth();
  
  // 1. Filter legally eligible assets
  const availableVehicles = await db
    .select()
    .from(vehicles)
    .where(
      and(
        eq(vehicles.status, "available"),
        gte(vehicles.maxLoadCapacity, cargoWeight.toString())
      )
    );

  const availableDrivers = await db
    .select()
    .from(drivers)
    .where(eq(drivers.status, "available"));

  if (availableVehicles.length === 0 || availableDrivers.length === 0) {
    return { error: "No eligible assets available" };
  }

  // 2. Ask Gemini to rank
  const prompt = `
  You are an expert logistics dispatcher. Given a trip with cargo weight ${cargoWeight}kg and target region "${targetRegion}", 
  recommend the best pairings of vehicle and driver from the provided eligible assets.
  
  Vehicles:
  ${JSON.stringify(availableVehicles.map(v => ({ id: v.id, name: v.name, region: v.region, maxLoadCapacity: v.maxLoadCapacity, odometer: v.odometer })), null, 2)}
  
  Drivers:
  ${JSON.stringify(availableDrivers.map(d => ({ id: d.id, name: d.name, region: d.region, safetyScore: d.safetyScore })), null, 2)}
  
  Rank the pairings considering:
  1. Load fit (closest capacity to cargo without being under).
  2. Safety score of the driver.
  3. Region match (if vehicle/driver region matches target region).
  
  Provide exactly the top 3 recommendations.
  Return JSON matching this schema:
  {
    "recommendations": [
      {
        "vehicleId": "uuid",
        "driverId": "uuid",
        "confidence": 0.95,
        "reason": "One line explanation"
      }
    ]
  }
  `;

  const schema = {
    type: "object",
    properties: {
      recommendations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            vehicleId: { type: "string" },
            driverId: { type: "string" },
            confidence: { type: "number" },
            reason: { type: "string" }
          },
          required: ["vehicleId", "driverId", "confidence", "reason"]
        }
      }
    },
    required: ["recommendations"]
  };

  try {
    const result = await askGemini(prompt, schema);
    
    // Save top recommendation to ai_suggestions
    if (result.recommendations && result.recommendations.length > 0) {
      const topRec = result.recommendations[0];
      await db.insert(aiSuggestions).values({
        type: "dispatch_recommendation",
        summary: topRec.reason,
        payload: result,
        confidence: topRec.confidence.toString(),
        createdBy: session?.user?.id,
      });
    }

    return result.recommendations;
  } catch (error) {
    console.error("Failed to get AI dispatch recommendations", error);
    return { error: "AI recommendation failed" };
  }
}
