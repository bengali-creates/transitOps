import { z } from "zod";

export const AssistantIntentSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("LICENCE_EXPIRY"),
    slots: z.object({
      within_days: z.number().describe("Number of days within which the licence is expiring."),
    }),
  }),
  z.object({
    intent: z.literal("FLEET_UTILIZATION"),
    slots: z.object({
      period: z.enum(["today", "week", "month"]).describe("The period to check utilization for."),
    }),
  }),
  z.object({
    intent: z.literal("HIGH_COST_VEHICLE"),
    slots: z.object({
      top_n: z.number().default(5).describe("Number of vehicles to return."),
      cost_type: z.enum(["fuel", "maintenance", "total"]).default("total"),
    }),
  }),
  z.object({
    intent: z.literal("DRIVER_SAFETY"),
    slots: z.object({
      threshold: z.number().optional().describe("Score threshold, e.g., below 80"),
      order: z.enum(["asc", "desc"]).default("asc"),
    }),
  }),
  z.object({
    intent: z.literal("VEHICLE_STATUS"),
    slots: z.object({
      status: z.enum(["available", "on_trip", "in_shop", "retired"]),
    }),
  }),
  z.object({
    intent: z.literal("UNKNOWN"),
    slots: z.object({}),
  }),
]);

export type AssistantIntent = z.infer<typeof AssistantIntentSchema>;
