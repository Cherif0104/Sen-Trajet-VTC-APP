import type { Role } from "./domain";

export const PERMISSIONS = [
  "dashboard.view",
  "requests.manage",
  "quotes.manage",
  "missions.manage",
  "customers.manage",
  "vehicles.manage",
  "catalog.manage",
  "owners.manage",
  "drivers.manage",
  "contracts.manage",
  "invoices.manage",
  "finance.manage",
  "reports.view",
  "maintenance.manage",
  "content.manage",
  "messages.manage",
  "users.manage",
  "settings.manage",
  "audit.view",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: ALL,
  admin: ALL,
  commercial: [
    "dashboard.view",
    "requests.manage",
    "quotes.manage",
    "missions.manage",
    "customers.manage",
    "contracts.manage",
    "content.manage",
    "messages.manage",
  ],
  flotte: [
    "dashboard.view",
    "vehicles.manage",
    "catalog.manage",
    "owners.manage",
    "drivers.manage",
    "missions.manage",
    "maintenance.manage",
  ],
  financier: [
    "dashboard.view",
    "invoices.manage",
    "finance.manage",
    "reports.view",
    "contracts.manage",
    "quotes.manage",
  ],
  client: [],
  proprietaire: [],
  chauffeur: [],
};

export function can(role: string | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (ROLE_PERMISSIONS[role as Role] ?? []).includes(permission);
}

export function isStaff(role: string | null | undefined): boolean {
  return !!role && can(role, "dashboard.view");
}

export function homeFor(role: string): string {
  if (isStaff(role)) return "/admin";
  if (role === "proprietaire") return "/proprietaire";
  if (role === "chauffeur") return "/chauffeur";
  return "/espace";
}
