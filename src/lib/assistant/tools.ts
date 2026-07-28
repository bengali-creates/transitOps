import type { Role } from "@/lib/rbac";

/**
 * Gemini Tool definition for each data fetcher.
 * Role-based filtering is applied before passing tools to the model,
 * so the model never even sees tools the user is not authorized to call.
 */
export type FleetTool = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  /** Roles that are authorized to use this tool */
  allowedRoles: Role[];
};

export const FLEET_TOOLS: FleetTool[] = [
  {
    type: "function",
    name: "fetchLicenceExpiries",
    description:
      "Returns a list of drivers whose driving licences expire within the specified number of days. Use this when the user asks about expiring licences, licence renewals, or compliance deadlines.",
    parameters: {
      type: "object",
      properties: {
        within_days: {
          type: "number",
          description:
            "The number of days within which to check for licence expiry. Defaults to 30 if not specified.",
        },
      },
      required: ["within_days"],
    },
    allowedRoles: ["fleet_manager", "safety_officer", "admin"],
  },
  {
    type: "function",
    name: "fetchFleetUtilization",
    description:
      "Returns fleet utilization statistics including percentage of vehicles on trip, available, and in maintenance for a given period. Use this when asked about fleet performance, utilization rates, or vehicle availability.",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["today", "week", "month"],
          description: "The time period to analyze. Defaults to 'today'.",
        },
      },
      required: ["period"],
    },
    allowedRoles: ["fleet_manager", "financial_analyst", "admin"],
  },
  {
    type: "function",
    name: "fetchHighCostVehicles",
    description:
      "Returns the top N vehicles ranked by acquisition cost. Use this when the user asks about expensive vehicles, cost outliers, or which vehicles have the highest costs.",
    parameters: {
      type: "object",
      properties: {
        top_n: {
          type: "number",
          description: "Number of vehicles to return. Defaults to 5.",
        },
        cost_type: {
          type: "string",
          enum: ["fuel", "maintenance", "total"],
          description: "The type of cost to rank by. Defaults to 'total'.",
        },
      },
      required: ["top_n", "cost_type"],
    },
    allowedRoles: ["fleet_manager", "financial_analyst", "admin"],
  },
  {
    type: "function",
    name: "fetchDriverSafetyRanking",
    description:
      "Returns a ranked list of drivers by safety score. Use this when asked about driver safety, risk ranking, or identifying low-scoring drivers. Can be filtered by a score threshold.",
    parameters: {
      type: "object",
      properties: {
        threshold: {
          type: "number",
          description:
            "Optional. Only return drivers with a safety score at or below this value (e.g. 80).",
        },
        order: {
          type: "string",
          enum: ["asc", "desc"],
          description:
            "Sort order for safety scores. 'asc' returns the worst drivers first.",
        },
      },
      required: ["order"],
    },
    allowedRoles: ["fleet_manager", "safety_officer", "admin"],
  },
  {
    type: "function",
    name: "fetchVehicleStatus",
    description:
      "Returns all vehicles that currently have a specific operational status. Use this when asked about available vehicles, vehicles on trips, vehicles in the workshop/shop, or retired vehicles.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["available", "on_trip", "in_shop", "retired"],
          description: "The operational status to filter vehicles by.",
        },
      },
      required: ["status"],
    },
    allowedRoles: ["fleet_manager", "financial_analyst", "admin"],
  },
];

/**
 * Filters the fleet tools list to only include tools the current role is authorized to call.
 * The filtered list is passed to Gemini so unauthorized tools are never even surfaced to the model.
 */
export function getAuthorizedTools(role: Role): FleetTool[] {
  return FLEET_TOOLS.filter((tool) => tool.allowedRoles.includes(role));
}
