import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  numeric,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { vehicleStatusEnum, driverStatusEnum } from "./enums";
import { users } from "./auth";

export const vehicles = pgTable("vehicles", {
  id: uuid("id").defaultRandom().primaryKey(),
  registrationNumber: text("registration_number").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  maxLoadCapacity: numeric("max_load_capacity", {
    precision: 10,
    scale: 2,
  }).notNull(),
  odometer: numeric("odometer", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  acquisitionCost: numeric("acquisition_cost", {
    precision: 12,
    scale: 2,
  }).notNull(),
  region: text("region"),
  status: vehicleStatusEnum("status").notNull().default("available"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const drivers = pgTable("drivers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  licenseNumber: text("license_number").notNull().unique(),
  licenseCategory: text("license_category").notNull(),
  licenseExpiryDate: date("license_expiry_date").notNull(),
  contactNumber: text("contact_number").notNull(),
  safetyScore: integer("safety_score").notNull().default(100),
  status: driverStatusEnum("status").notNull().default("available"),
  region: text("region"),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const driversRelations = relations(drivers, ({ one }) => ({
  user: one(users, {
    fields: [drivers.userId],
    references: [users.id],
  }),
}));
