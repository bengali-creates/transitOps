import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Central place for every enumerated value used across the schema.
 * Keeping enums in one file avoids circular imports between table files.
 */

export const userRoleEnum = pgEnum("user_role", [
  "fleet_manager",
  "driver",
  "safety_officer",
  "financial_analyst",
]);

export const vehicleStatusEnum = pgEnum("vehicle_status", [
  "available",
  "on_trip",
  "in_shop",
  "retired",
]);

export const driverStatusEnum = pgEnum("driver_status", [
  "available",
  "on_trip",
  "off_duty",
  "suspended",
]);

export const tripStatusEnum = pgEnum("trip_status", [
  "draft",
  "dispatched",
  "completed",
  "cancelled",
]);

export const maintenanceStatusEnum = pgEnum("maintenance_status", [
  "open",
  "closed",
]);

export const expenseTypeEnum = pgEnum("expense_type", [
  "fuel",
  "toll",
  "maintenance",
  "parking",
  "other",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "insurance",
  "registration",
  "permit",
  "pollution_certificate",
  "fitness_certificate",
  "other",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "license_expiry",
  "maintenance_due",
  "document_expiry",
  "fuel_anomaly",
  "safety_alert",
]);

export const aiSuggestionTypeEnum = pgEnum("ai_suggestion_type", [
  "dispatch_recommendation",
  "predictive_maintenance",
  "fuel_anomaly",
  "assistant_query",
]);
