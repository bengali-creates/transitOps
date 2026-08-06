import { NextResponse } from "next/server";
import { ingestDocument } from "@/server/services/rag/ingest";

const FIXTURE_DOCS = [
  {
    source: "cargo_sop.txt",
    content: `TransitOps Cargo Overload Policy: Vehicles must never exceed their maximum cargo weight. Overloading by even 1% is a strict safety violation. Under weight limits, Mini Trucks hold up to 1000kg, Vans hold up to 1500kg, and Trucks hold up to 5000kg. Overloading incurs a $500 penalty and compliance audit. If cargo weight exceeds a vehicle's capacity, the agent must search for an alternative vehicle or reject the trip proposal.`,
  },
  {
    source: "driver_handbook.txt",
    content: `TransitOps Driver Compliance Guidelines: All active drivers must hold an active, unexpired license. Licences must be updated 30 days before expiration. Drivers operating Trucks must hold a commercial driver's license (CDL). Rest periods of 8 hours are mandatory after every 10 hours of continuous driving. Drivers must maintain a safety score of 3.0 or higher.`,
  },
  {
    source: "weather_sop.txt",
    content: `TransitOps Weather Safety Protocols: High risk weather alerts (heavy storms, blizzards, hurricanes, low visibility fog) require immediate route detouring. Operations planners must execute Dijkstra detour searches bypassing the affected corridor. If no detour path is available, the trip must be marked as cancelled or delayed. For safety, detours must follow established secondary corridors connecting authorized depots.`,
  },
];

export async function POST(req: Request) {
  try {
    let totalInserted = 0;
    let totalChunks = 0;

    for (const doc of FIXTURE_DOCS) {
      const result = await ingestDocument(doc.source, doc.content);
      if (result.success) {
        totalInserted += result.insertedCount;
        totalChunks += result.totalChunks;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Idempotent RAG fixtures ingestion completed.",
      insertedChunks: totalInserted,
      totalChunks,
    });
  } catch (error: any) {
    console.error("RAG Ingest endpoint error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
