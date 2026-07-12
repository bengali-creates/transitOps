import { NextResponse } from "next/server";
import { detectAnomalies } from "@/server/services/anomaly-ai";

export async function POST(req: Request) {
  try {
    // In a real scenario, this would be a cron job or protected endpoint.
    // For demo purposes, we trigger it manually.
    await detectAnomalies();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Anomaly Detection Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
