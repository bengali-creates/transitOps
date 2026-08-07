import { NextResponse } from "next/server";
import { db } from "@/db";
import { ragEvalRuns } from "@/db/schema";
import { desc } from "drizzle-orm";

const EVAL_SERVICE_URL = process.env.PYTHON_EVAL_URL || "http://localhost:8002";

export async function GET() {
  try {
    const runs = await db
      .select()
      .from(ragEvalRuns)
      .orderBy(desc(ragEvalRuns.createdAt))
      .limit(30);

    return NextResponse.json(runs);
  } catch (error: any) {
    console.error("Failed to fetch RAG runs:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const res = await fetch(`${EVAL_SERVICE_URL}/eval/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger: "manual" }),
    });

    if (!res.ok) {
      throw new Error(`Python eval service responded with status ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Failed to trigger RAG evaluation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
