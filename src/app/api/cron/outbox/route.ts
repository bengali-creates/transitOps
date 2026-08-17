import { NextResponse } from "next/server";
import { db } from "@/db";
import { outbox } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";
import { pool } from "@/db/tx";

export async function POST(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("Authorization");
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pendingEvents = await db
      .select()
      .from(outbox)
      .where(isNull(outbox.processedAt))
      .orderBy(outbox.createdAt);

    if (pendingEvents.length === 0) {
      return NextResponse.json({ success: true, processedCount: 0 });
    }

    const client = await pool.connect();
    try {
      for (const event of pendingEvents) {
        await db
          .update(outbox)
          .set({ processedAt: new Date() })
          .where(eq(outbox.id, event.id));

        const payloadString = JSON.stringify({
          eventType: event.eventType,
          payload: event.payload,
        });
        await client.query(`SELECT pg_notify('fleet_events', $1)`, [payloadString]);
      }
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true, processedCount: pendingEvents.length });
  } catch (error: any) {
    console.error("Outbox cron error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
