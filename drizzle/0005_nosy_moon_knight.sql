CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(768) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_chunks_content_hash_unique" UNIQUE("content_hash")
);
--> statement-breakpoint
CREATE TABLE "rag_eval_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_recall" numeric(5, 4) NOT NULL,
	"metric_precision" numeric(5, 4) NOT NULL,
	"metric_mrr" numeric(5, 4) NOT NULL,
	"metric_ndcg" numeric(5, 4) NOT NULL,
	"metric_faithfulness" numeric(5, 4) NOT NULL,
	"metric_relevance" numeric(5, 4) NOT NULL,
	"run_payload" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
