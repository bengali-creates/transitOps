CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"depot_name" text DEFAULT 'Gandhinagar Depot GJ4' NOT NULL,
	"currency" text DEFAULT 'INR (Rs)' NOT NULL,
	"distance_unit" text DEFAULT 'Kilometers' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
