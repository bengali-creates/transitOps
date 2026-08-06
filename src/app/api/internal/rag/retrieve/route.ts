import { NextResponse } from "next/server";
import { retrieve } from "@/server/services/rag/retrieve";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const k = Number(searchParams.get("k") || "3");

    if (!query) {
      return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
    }

    const contextChunks = await retrieve(query, k);
    return NextResponse.json(contextChunks);
  } catch (error: any) {
    console.error("Internal RAG retrieve API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
