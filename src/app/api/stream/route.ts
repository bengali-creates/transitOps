import { NextResponse } from "next/server";
import { pool } from "@/db/tx";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  let client: any = null;
  try {
    client = await pool.connect();
    await client.query("LISTEN fleet_events");

    const onNotification = (msg: any) => {
      const data = JSON.stringify({
        channel: msg.channel,
        payload: msg.payload,
      });
      writer.write(encoder.encode(`data: ${data}\n\n`));
    };

    client.on("notification", onNotification);

    // Keep-alive to prevent client connection timeout
    const keepAlive = setInterval(() => {
      try {
        writer.write(encoder.encode(": keepalive\n\n"));
      } catch (err) {
        clearInterval(keepAlive);
      }
    }, 15000);

    req.signal.addEventListener("abort", () => {
      clearInterval(keepAlive);
      if (client) {
        client.off("notification", onNotification);
        client.query("UNLISTEN fleet_events").catch(() => {});
        client.release();
      }
      try {
        writer.close();
      } catch (err) {}
    });

  } catch (err) {
    if (client) client.release();
    return new NextResponse("SSE connection failed", { status: 500 });
  }

  return new NextResponse(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
