import { db } from "@/db";
import { knowledgeChunks } from "@/db/schema";
import { ai } from "@/lib/gemini";
import { createHash } from "crypto";

interface IngestionResult {
  success: boolean;
  insertedCount: number;
  totalChunks: number;
}


export function chunkText(text: string, chunkSize: number = 600, overlap: number = 120): string[] {
  const chunks: string[] = [];
  let index = 0;

  while (index < text.length) {
    const chunk = text.slice(index, index + chunkSize);
    chunks.push(chunk);
    index += chunkSize - overlap;
    if (chunk.length < chunkSize) break;
  }

  return chunks;
}


function computeHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Embeds chunks using Gemini API and upserts them into knowledge_chunks.
 */
export async function ingestDocument(source: string, text: string): Promise<IngestionResult> {
  try {
    const chunks = chunkText(text);
    let insertedCount = 0;

    for (const chunk of chunks) {
      if (chunk.trim().length < 10) continue;

      const contentHash = computeHash(chunk);

     
      const response = (await ai.models.embedContent({
        model: "gemini-embedding-2",
        contents: chunk,
        config: { outputDimensionality: 768 }
      })) as any;

      const embedding = response.embeddings?.[0]?.values;
      if (!embedding || embedding.length === 0) {
        console.warn(`Failed to generate embedding for chunk from: ${source}`);
        continue;
      }

      try {
        await db
          .insert(knowledgeChunks)
          .values({
            source,
            content: chunk,
            embedding,
            contentHash,
            metadata: { source, length: chunk.length },
          })
          .onConflictDoNothing();
        
        insertedCount++;
      } catch (dbErr) {
      }
    }

    return {
      success: true,
      insertedCount,
      totalChunks: chunks.length,
    };
  } catch (error) {
    console.error(`Failed to ingest document ${source}:`, error);
    return { success: false, insertedCount: 0, totalChunks: 0 };
  }
}
