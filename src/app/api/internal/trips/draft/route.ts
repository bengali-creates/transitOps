import { NextResponse } from "next/server";
import { db } from "@/db";
import { trips } from "@/db/schema";
import { tripCreateSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Parse and validate using existing M6 validation schema
    const parsed = tripCreateSchema.parse({
      source: body.source,
      destination: body.destination,
      vehicleId: body.vehicleId,
      driverId: body.driverId,
      cargoWeight: body.cargoWeight,
      plannedDistance: body.plannedDistance,
    });

    const [newTrip] = await db
      .insert(trips)
      .values({
        source: parsed.source,
        destination: parsed.destination,
        vehicleId: parsed.vehicleId,
        driverId: parsed.driverId,
        cargoWeight: String(parsed.cargoWeight),
        plannedDistance: String(parsed.plannedDistance),
        status: "draft",
      })
      .returning();

    return NextResponse.json({ success: true, tripId: newTrip.id, status: newTrip.status });
  } catch (error: any) {
    console.error("Internal API error drafting trip:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to draft trip" }, { status: 400 });
  }
}
