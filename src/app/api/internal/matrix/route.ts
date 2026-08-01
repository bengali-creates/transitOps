import { NextResponse } from "next/server";
import { estimateTrip } from "@/server/services/matrix-service";
import { estimateTripSchema } from "@/lib/validations";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const originId = searchParams.get("originId");
    const destinationId = searchParams.get("destinationId");
    const vehicleType = searchParams.get("vehicleType");

    const parsed = estimateTripSchema.parse({
      originId,
      destinationId,
      vehicleType,
    });

    const estimation = await estimateTrip(
      parsed.originId,
      parsed.destinationId,
      parsed.vehicleType
    );

    return NextResponse.json(estimation);
  } catch (error: any) {
    console.error("Internal API error estimating route:", error);
    return NextResponse.json({ error: error.message || "Bad Request" }, { status: 400 });
  }
}
