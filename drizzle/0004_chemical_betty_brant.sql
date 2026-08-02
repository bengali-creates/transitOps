CREATE TABLE "depot_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_depot_id" uuid NOT NULL,
	"to_depot_id" uuid NOT NULL,
	"distance_km" numeric(10, 2) NOT NULL,
	"toll_cost" numeric(10, 2) DEFAULT '0.00',
	"geometry" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "depots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"region" text NOT NULL,
	"latitude" numeric(10, 6) NOT NULL,
	"longitude" numeric(10, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "depots_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "depot_edges" ADD CONSTRAINT "depot_edges_from_depot_id_depots_id_fk" FOREIGN KEY ("from_depot_id") REFERENCES "public"."depots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "depot_edges" ADD CONSTRAINT "depot_edges_to_depot_id_depots_id_fk" FOREIGN KEY ("to_depot_id") REFERENCES "public"."depots"("id") ON DELETE cascade ON UPDATE no action;