
export type Role =
  | "fleet_manager"
  | "driver"
  | "safety_officer"
  | "financial_analyst"
  | "admin";

export type Permission =
  | "vehicle:read"
  | "vehicle:write"
  | "driver:read"
  | "driver:write"
  | "driver:compliance"
  | "trip:read"
  | "trip:write"
  | "maintenance:read"
  | "maintenance:write"
  | "finance:read"
  | "finance:write"
  | "reports:read"
  | "ai:use";

const MATRIX: Record<Role, Permission[]> = {
  fleet_manager: [
    "vehicle:read",
    "vehicle:write",
    "driver:read",
    "maintenance:read",
    "maintenance:write",
    "trip:read",
    "reports:read",
    "ai:use",
  ],
  driver: ["vehicle:read", "driver:read", "trip:read", "trip:write", "ai:use"],
  safety_officer: [
    "driver:read",
    "driver:write",
    "driver:compliance",
    "trip:read",
    "reports:read",
    "ai:use",
  ],
  financial_analyst: [
    "finance:read",
    "finance:write",
    "reports:read",
    "vehicle:read",
    "trip:read",
    "ai:use",
  ],
  admin: [
    "vehicle:read",
    "vehicle:write",
    "driver:read",
    "driver:write",
    "driver:compliance",
    "trip:read",
    "trip:write",
    "maintenance:read",
    "maintenance:write",
    "finance:read",
    "finance:write",
    "reports:read",
    "ai:use",
  ],
};

export function can(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false;
  return MATRIX[role]?.includes(permission) ?? false;
}
