import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  date,
  jsonb,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  documentTypeEnum,
  notificationTypeEnum,
  aiSuggestionTypeEnum,
} from "./enums";
import { vehicles } from "./fleet";
import { users } from "./auth";

/**
 * Vehicle documents (bonus). extractedData holds fields pulled by Bedrock from
 * an uploaded image or PDF, so expiry dates can drive compliance reminders.
 */
export const vehicleDocuments = pgTable("vehicle_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehicles.id, { onDelete: "cascade" }),
  type: documentTypeEnum("type").notNull(),
  fileUrl: text("file_url").notNull(),
  expiryDate: date("expiry_date"),
  extractedData: jsonb("extracted_data"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Immutable log of automatic status transitions on vehicles, drivers, and trips.
 * Gives auditability for every rule-driven state change and feeds analytics.
 */
export const statusHistory = pgTable("status_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: text("entity_type").notNull(), // vehicle | driver | trip | maintenance
  entityId: uuid("entity_id").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  reason: text("reason"),
  triggeredBy: uuid("triggered_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** In-app notifications, also used to back email reminders (bonus). */
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  entityId: uuid("entity_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Persisted output from Bedrock features: dispatch recommendations, predictive
 * maintenance flags, fuel anomaly findings, and assistant answers.
 * confidence is 0 to 1. payload keeps the full structured model response.
 */
export const aiSuggestions = pgTable("ai_suggestions", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: aiSuggestionTypeEnum("type").notNull(),
  entityId: uuid("entity_id"),
  summary: text("summary").notNull(),
  payload: jsonb("payload"),
  confidence: numeric("confidence", { precision: 4, scale: 3 }),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const vehicleDocumentsRelations = relations(
  vehicleDocuments,
  ({ one }) => ({
    vehicle: one(vehicles, {
      fields: [vehicleDocuments.vehicleId],
      references: [vehicles.id],
    }),
  }),
);

export const settings = pgTable("settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  depotName: text("depot_name").notNull().default("Gandhinagar Depot GJ4"),
  currency: text("currency").notNull().default("INR (Rs)"),
  distanceUnit: text("distance_unit").notNull().default("Kilometers"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
