import { z } from "zod";

/**
 * Zod schemas are the single source of validation truth, shared by server
 * actions and client forms. Numeric money and load values arrive as strings from
 * forms, so coerce and bound them here.
 */

export const vehicleSchema = z.object({
  registrationNumber: z.string().min(2).max(32),
  name: z.string().min(1),
  type: z.string().min(1),
  maxLoadCapacity: z.coerce.number().positive(),
  odometer: z.coerce.number().min(0).default(0),
  acquisitionCost: z.coerce.number().min(0),
  region: z.string().optional(),
  status: z
    .enum(["available", "on_trip", "in_shop", "retired"])
    .default("available"),
});

export const driverSchema = z.object({
  name: z.string().min(1),
  licenseNumber: z.string().min(2),
  licenseCategory: z.string().min(1),
  licenseExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contactNumber: z.string().min(5),
  safetyScore: z.coerce.number().int().min(0).max(100).default(100),
  region: z.string().optional(),
  status: z
    .enum(["available", "on_trip", "off_duty", "suspended"])
    .default("available"),
});

export const tripCreateSchema = z.object({
  source: z.string().min(1),
  destination: z.string().min(1),
  vehicleId: z.string().uuid(),
  driverId: z.string().uuid(),
  cargoWeight: z.coerce.number().positive(),
  plannedDistance: z.coerce.number().positive(),
});

export const tripCompleteSchema = z.object({
  tripId: z.string().uuid(),
  finalOdometer: z.coerce.number().positive(),
  fuelConsumed: z.coerce.number().min(0),
  revenue: z.coerce.number().min(0).optional(),
});

export const maintenanceSchema = z.object({
  vehicleId: z.string().uuid(),
  type: z.string().min(1),
  description: z.string().optional(),
  cost: z.coerce.number().min(0).default(0),
  odometer: z.coerce.number().min(0).optional(),
});

export const fuelLogSchema = z.object({
  vehicleId: z.string().uuid(),
  tripId: z.string().uuid().optional(),
  liters: z.coerce.number().positive(),
  cost: z.coerce.number().min(0),
  odometer: z.coerce.number().min(0).optional(),
  loggedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const expenseSchema = z.object({
  vehicleId: z.string().uuid().optional(),
  tripId: z.string().uuid().optional(),
  type: z.enum(["fuel", "toll", "maintenance", "parking", "other"]),
  amount: z.coerce.number().min(0),
  description: z.string().optional(),
  incurredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;
export type DriverInput = z.infer<typeof driverSchema>;
export type TripCreateInput = z.infer<typeof tripCreateSchema>;
