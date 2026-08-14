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

export const statusHistory = pgTable("status_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: text("entity_type").notNull(), // vehicle | driver | trip | maintenance
  entityId: uuid("entity_id").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  reason: text("reason"),
  metadata: jsonb("metadata"),
  triggeredBy: uuid("triggered_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
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


export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  messages: jsonb("messages").default([]).notNull(), // Array of { role, content, intent, data_summary, actions, timestamp }
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const outbox = pgTable("outbox", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  idempotencyKey: text("idempotency_key").unique().notNull(),
});
