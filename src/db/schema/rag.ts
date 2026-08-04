import {
  pgTable,
  text,
  timestamp,
  uuid,
  numeric,
  jsonb,
  customType,
} from "drizzle-orm/pg-core";

export const vectorColumn = customType<{ data: number[] }>({
  dataType() {
    return "vector(768)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: unknown): number[] {
    if (typeof value === "string") {
      return value.slice(1, -1).split(",").map(Number);
    }
    return value as number[];
  },
});

export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: text("source").notNull(),
  content: text("content").notNull(),
  embedding: vectorColumn("embedding").notNull(),
  metadata: jsonb("metadata").default({}),
  contentHash: text("content_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ragEvalRuns = pgTable("rag_eval_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  metricRecall: numeric("metric_recall", { precision: 5, scale: 4 }).notNull(),
  metricPrecision: numeric("metric_precision", { precision: 5, scale: 4 }).notNull(),
  metricMrr: numeric("metric_mrr", { precision: 5, scale: 4 }).notNull(),
  metricNdcg: numeric("metric_ndcg", { precision: 5, scale: 4 }).notNull(),
  metricFaithfulness: numeric("metric_faithfulness", { precision: 5, scale: 4 }).notNull(),
  metricRelevance: numeric("metric_relevance", { precision: 5, scale: 4 }).notNull(),
  runPayload: jsonb("run_payload").default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
