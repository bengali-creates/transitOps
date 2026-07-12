import { NextResponse } from "next/server";
import { getDispatchRecommendations } from "@/server/services/dispatch-ai";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !can((session.user as any).role, "trip:write")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { cargoWeight, targetRegion } = body;

    if (!cargoWeight || !targetRegion) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const recommendations = await getDispatchRecommendations(Number(cargoWeight), targetRegion);
    
    return NextResponse.json(recommendations);
  } catch (error) {
    console.error("AI Dispatch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
