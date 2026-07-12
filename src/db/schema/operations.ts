import {
  pgTable,
  text,
  timestamp,
  uuid,
  numeric,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  tripStatusEnum,
  maintenanceStatusEnum,
  expenseTypeEnum,
} from "./enums";
import { vehicles, drivers } from "./fleet";
import { users } from "./auth";

/**
 * Trips. Lifecycle: draft -> dispatched -> completed | cancelled.
 * revenue is optional and drives the ROI report. Timestamp columns record
 * each transition so the analytics layer can measure cycle time.
 */
export const trips = pgTable("trips", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: text("source").notNull(),
  destination: text("destination").notNull(),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehicles.id),
  driverId: uuid("driver_id")
    .notNull()
    .references(() => drivers.id),
  cargoWeight: numeric("cargo_weight", { precision: 10, scale: 2 }).notNull(),
  plannedDistance: numeric("planned_distance", {
    precision: 10,
    scale: 2,
  }).notNull(),
  actualDistance: numeric("actual_distance", { precision: 10, scale: 2 }),
  startOdometer: numeric("start_odometer", { precision: 12, scale: 2 }),
  finalOdometer: numeric("final_odometer", { precision: 12, scale: 2 }),
  fuelConsumed: numeric("fuel_consumed", { precision: 10, scale: 2 }),
  revenue: numeric("revenue", { precision: 12, scale: 2 }),
  status: tripStatusEnum("status").notNull().default("draft"),
  createdBy: uuid("created_by").references(() => users.id),
  dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Maintenance logs. Opening an active (open) record moves the vehicle to in_shop.
 * Closing it restores the vehicle to available unless it was retired.
 */
export const maintenanceLogs = pgTable("maintenance_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehicles.id),
  type: text("type").notNull(),
  description: text("description"),
  cost: numeric("cost", { precision: 12, scale: 2 }).notNull().default("0"),
  odometer: numeric("odometer", { precision: 12, scale: 2 }),
  status: maintenanceStatusEnum("status").notNull().default("open"),
  openedAt: timestamp("opened_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Fuel logs. Linked to a vehicle and optionally the trip during which fuel was
 * consumed. odometer at fill time supports distance and efficiency math.
 */
export const fuelLogs = pgTable("fuel_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehicles.id),
  tripId: uuid("trip_id").references(() => trips.id),
  liters: numeric("liters", { precision: 10, scale: 2 }).notNull(),
  cost: numeric("cost", { precision: 12, scale: 2 }).notNull(),
  odometer: numeric("odometer", { precision: 12, scale: 2 }),
  loggedDate: date("logged_date").notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * General expenses (tolls, parking, misc). Maintenance and fuel have their own
 * tables, but expense rows can also reference them for a single cost ledger.
 */
export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id),
  tripId: uuid("trip_id").references(() => trips.id),
  type: expenseTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  incurredDate: date("incurred_date").notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tripsRelations = relations(trips, ({ one, many }) => ({
  vehicle: one(vehicles, {
    fields: [trips.vehicleId],
    references: [vehicles.id],
  }),
  driver: one(drivers, {
    fields: [trips.driverId],
    references: [drivers.id],
  }),
  fuelLogs: many(fuelLogs),
  expenses: many(expenses),
}));

export const maintenanceLogsRelations = relations(
  maintenanceLogs,
  ({ one }) => ({
    vehicle: one(vehicles, {
      fields: [maintenanceLogs.vehicleId],
      references: [vehicles.id],
    }),
  }),
);

export const fuelLogsRelations = relations(fuelLogs, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [fuelLogs.vehicleId],
    references: [vehicles.id],
  }),
  trip: one(trips, {
    fields: [fuelLogs.tripId],
    references: [trips.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [expenses.vehicleId],
    references: [vehicles.id],
  }),
  trip: one(trips, {
    fields: [expenses.tripId],
    references: [trips.id],
  }),
}));
