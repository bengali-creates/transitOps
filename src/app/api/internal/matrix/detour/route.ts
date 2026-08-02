import { NextResponse } from "next/server";
import { getDetourRoutes } from "@/server/services/matrix-service";
import { db } from "@/db";
import { depots } from "@/db/schema";
import { eq } from "drizzle-orm";

const FUEL_RATES: Record<string, number> = {
  "Truck": 0.35,
  "Mini Truck": 0.20,
  "Van": 0.15,
  "Ship": 1.50,
  "default": 0.25,
};

const FUEL_PRICE_PER_LITER = 96.7;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { originId, destinationId, vehicleType, blockedEdgeIds = [] } = body;

    if (!originId || !destinationId || !vehicleType) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const result = await getDetourRoutes(originId, destinationId, blockedEdgeIds);

    if (!result.reachable) {
      return NextResponse.json({
        reachable: false,
        distanceKm: 0,
        estimatedFuelLiters: 0,
        estimatedCost: 0,
        path: [],
        tollCost: 0,
        geometry: [],
      });
    }

    // Calculate fuel & cost for the detour path
    const fuelRate = FUEL_RATES[vehicleType] ?? FUEL_RATES["default"];
    const estimatedFuel = result.distanceKm * fuelRate;
    const fuelCost = estimatedFuel * FUEL_PRICE_PER_LITER;
    const totalCost = fuelCost + result.tollCost;

    return NextResponse.json({
      reachable: true,
      distanceKm: result.distanceKm,
      estimatedFuelLiters: Number(estimatedFuel.toFixed(2)),
      estimatedCost: Number(totalCost.toFixed(2)),
      path: result.path,
      tollCost: result.tollCost,
      geometry: result.geometry,
    });
  } catch (error: any) {
    console.error("Internal detour API error:", error);
    return NextResponse.json({ error: error.message || "Bad Request" }, { status: 400 });
  }
}
