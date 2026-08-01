import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { can, type Role } from "@/lib/rbac";
import { db } from "@/db";
import { aiSuggestions } from "@/db/schema";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role as Role;
    if (!can(role, "vehicle:write") || !can(role, "trip:write")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { goal, cargoWeight, region } = body;

    if (!goal || !cargoWeight) {
      return NextResponse.json({ error: "Goal and cargoWeight are required" }, { status: 400 });
    }

    const agentServiceUrl = process.env.AGENT_SERVICE_URL || "http://localhost:8001";
    
    const response = await fetch(`${agentServiceUrl}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, cargoWeight, region }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Agent service error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json({ error: data.error || "Agent failed to plan" }, { status: 500 });
    }

    const stepsCount = data.steps ? data.steps.length : 0;
    const confidence = Math.max(0.3, Math.min(1.0, 1.0 - stepsCount * 0.03));
    const [newSuggestion] = await db
      .insert(aiSuggestions)
      .values({
        type: "dispatch_recommendation",
        summary: data.plan.slice(0, 255),
        payload: {
          fullPlan: data.plan,
          stepsTrace: data.steps,
          cargoWeight,
          region,
        },
        confidence: String(confidence),
        createdBy: session.user.id,
      })
      .returning();

    return NextResponse.json({
      success: true,
      suggestionId: newSuggestion.id,
      plan: data.plan,
      steps: data.steps,
      confidence: confidence,
    });
  } catch (error: any) {
    console.error("Agent plan route error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
