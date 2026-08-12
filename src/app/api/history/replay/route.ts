import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { reconstructAsOf } from "@/server/services/projections";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const timestampStr = searchParams.get("timestamp");

    if (!entityType || !entityId || !timestampStr) {
      return NextResponse.json(
        { error: "Missing required query parameters: entityType, entityId, timestamp" },
        { status: 400 }
      );
    }

    if (entityType !== "trip" && entityType !== "vehicle" && entityType !== "driver") {
      return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });
    }

    // Role-Based Access Control check
    const role = (session.user as any).role;
    const permission = `${entityType}:read` as any;
    if (!can(role, permission)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const timestamp = new Date(timestampStr);
    if (isNaN(timestamp.getTime())) {
      return NextResponse.json({ error: "Invalid timestamp format" }, { status: 400 });
    }

    const projection = await reconstructAsOf(entityType, entityId, timestamp);
    return NextResponse.json(projection);
  } catch (error) {
    console.error("Time-Travel Replay Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
