import { db } from "@/db";
import { vehicles, fuelLogs, maintenanceLogs, aiSuggestions, notifications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { askGemini } from "@/lib/gemini";

export async function detectAnomalies() {
  const allVehicles = await db.select().from(vehicles);
  
  for (const vehicle of allVehicles) {
    // 1. Predictive Maintenance
    const latestMaintenance = await db
      .select()
      .from(maintenanceLogs)
      .where(eq(maintenanceLogs.vehicleId, vehicle.id))
      .orderBy(desc(maintenanceLogs.createdAt))
      .limit(1);

    const odometer = Number(vehicle.odometer || 0);
    const lastServiceOdometer = latestMaintenance.length > 0 ? Number(latestMaintenance[0].odometer || 0) : 0;
    const distanceSinceService = odometer - lastServiceOdometer;

    const pmPrompt = `
    You are an AI fleet mechanic. 
    Analyze this vehicle for predictive maintenance risk:
    Vehicle: ${vehicle.name} (Type: ${vehicle.type})
    Current Odometer: ${odometer} km
    Distance since last service: ${distanceSinceService} km
    
    Determine if this vehicle is at risk of breakdown.
    Return JSON matching this schema:
    {
      "isAtRisk": boolean,
      "confidence": number,
      "reason": "String explaining why"
    }
    `;

    const pmSchema = {
      type: "object",
      properties: {
        isAtRisk: { type: "boolean" },
        confidence: { type: "number" },
        reason: { type: "string" }
      },
      required: ["isAtRisk", "confidence", "reason"]
    };

    try {
      const pmResult = await askGemini(pmPrompt, pmSchema);
      if (pmResult.isAtRisk) {
        await db.insert(aiSuggestions).values({
          type: "predictive_maintenance",
          entityId: vehicle.id,
          summary: pmResult.reason,
          payload: pmResult,
          confidence: pmResult.confidence.toString(),
        });
        await db.insert(notifications).values({
          type: "maintenance_due",
          title: "Predictive Maintenance Alert",
          message: `${vehicle.name}: ${pmResult.reason}`,
          entityId: vehicle.id,
        });
      }
    } catch (e) {
      console.error("Predictive maintenance error", e);
    }

    // 2. Fuel Anomaly Detection
    const recentFuelLogs = await db
      .select()
      .from(fuelLogs)
      .where(eq(fuelLogs.vehicleId, vehicle.id))
      .orderBy(desc(fuelLogs.createdAt))
      .limit(5);

    if (recentFuelLogs.length >= 2) {
      const fuelPrompt = `
      You are an AI fleet auditor. 
      Review these recent fuel logs for ${vehicle.name} (${vehicle.type}):
      ${JSON.stringify(recentFuelLogs.map(f => ({ liters: f.liters, cost: f.cost, odometer: f.odometer, date: f.loggedDate })), null, 2)}
      
      Look for anomalies like sudden drops in efficiency or unusual costs.
      Return JSON matching this schema:
      {
        "hasAnomaly": boolean,
        "confidence": number,
        "reason": "String explaining the anomaly",
        "suggestedAction": "What to do"
      }
      `;

      const fuelSchema = {
        type: "object",
        properties: {
          hasAnomaly: { type: "boolean" },
          confidence: { type: "number" },
          reason: { type: "string" },
          suggestedAction: { type: "string" }
        },
        required: ["hasAnomaly", "confidence", "reason", "suggestedAction"]
      };

      try {
        const fuelResult = await askGemini(fuelPrompt, fuelSchema);
        if (fuelResult.hasAnomaly) {
          await db.insert(aiSuggestions).values({
            type: "fuel_anomaly",
            entityId: vehicle.id,
            summary: fuelResult.reason,
            payload: fuelResult,
            confidence: fuelResult.confidence.toString(),
          });
          await db.insert(notifications).values({
            type: "fuel_anomaly",
            title: "Fuel Anomaly Detected",
            message: `${vehicle.name}: ${fuelResult.reason}`,
            entityId: vehicle.id,
          });
        }
      } catch (e) {
        console.error("Fuel anomaly error", e);
      }
    }
  }
}
