import { NextResponse } from "next/server";
import { detectAnomalies } from "@/server/services/anomaly-ai";

export async function POST(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("Authorization");

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await detectAnomalies();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Anomaly Detection Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
