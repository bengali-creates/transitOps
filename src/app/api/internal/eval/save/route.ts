import { NextResponse } from "next/server";
import { db } from "@/db";
import { ragEvalRuns } from "@/db/schema";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      metricRecall,
      metricPrecision,
      metricMrr,
      metricNdcg,
      metricFaithfulness,
      metricRelevance,
      runPayload,
    } = body;

    if (
      metricRecall === undefined ||
      metricPrecision === undefined ||
      metricMrr === undefined ||
      metricNdcg === undefined ||
      metricFaithfulness === undefined ||
      metricRelevance === undefined
    ) {
      return NextResponse.json({ error: "Missing metric parameters" }, { status: 400 });
    }

    const [newRun] = await db
      .insert(ragEvalRuns)
      .values({
        metricRecall: String(metricRecall),
        metricPrecision: String(metricPrecision),
        metricMrr: String(metricMrr),
        metricNdcg: String(metricNdcg),
        metricFaithfulness: String(metricFaithfulness),
        metricRelevance: String(metricRelevance),
        runPayload: runPayload || {},
      })
      .returning();

    return NextResponse.json({ success: true, runId: newRun.id });
  } catch (error: any) {
    console.error("Internal RAG save eval API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
