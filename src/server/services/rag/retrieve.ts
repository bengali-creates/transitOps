import { db } from "@/db";
import { knowledgeChunks } from "@/db/schema";
import { ai } from "@/lib/gemini";
import { sql } from "drizzle-orm";

export interface RetrievedChunk {
  id: string;
  source: string;
  content: string;
  metadata: any;
  similarity: number;
}

/**
 * Performs semantic search retrieval by embedding the query and
 * executing a cosine similarity check using Neon pgvector.
 */
export async function retrieve(query: string, k: number = 3): Promise<RetrievedChunk[]> {
  try {
    if (!query || query.trim() === "") {
      return [];
    }

    const response = (await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: query,
      config: { outputDimensionality: 768 }
    })) as any;

    const queryVector = response.embeddings?.[0]?.values;
    if (!queryVector || queryVector.length === 0) {
      console.warn("Failed to generate embedding vector for retrieval query");
      return [];
    }

    const similarityExpression = sql<number>`1 - (${knowledgeChunks.embedding} <=> ${sql.raw(`'[${queryVector.join(",")}]'`)}::vector)`;

    const results = await db
      .select({
        id: knowledgeChunks.id,
        source: knowledgeChunks.source,
        content: knowledgeChunks.content,
        metadata: knowledgeChunks.metadata,
        similarity: similarityExpression,
      })
      .from(knowledgeChunks)
      .orderBy(sql`${knowledgeChunks.embedding} <=> ${sql.raw(`'[${queryVector.join(",")}]'`)}::vector`)
      .limit(k);

    return results as RetrievedChunk[];
  } catch (error) {
    console.error("RAG retrieval error:", error);
    return [];
  }
}
