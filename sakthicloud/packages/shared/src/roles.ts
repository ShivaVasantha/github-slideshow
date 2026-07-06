// Role → default module access, plus the per-user override resolution.
// Mirrors the prototype's ROLES map + effectiveModules(). Owners always get
// everything; a user's explicit `allowedModules` (the owner override stored in
// users.allowed_modules) wins over the role default when present.
//
// NOTE: the per-role lists below are the faithful shape; port the exact arrays
// from the prototype's ROLES object when migrating the User Management module.

import { ALL_NAV } from "./nav";
import type { AuthUser } from "./schemas/auth";

const ALL_MODULE_IDS = ALL_NAV.map((n) => n.id);

// Core front-desk set every guest-facing role needs.
const FRONT_DESK = [
  "dashboard", "rooms", "bookings", "folio", "tapechart", "nightaudit",
  "housekeeping", "compliance", "reports", "guestcrm",
];

export const ROLES: Record<string, { label: string; modules: string[] }> = {
  OWNER: { label: "Owner", modules: ALL_MODULE_IDS },
  MANAGER: { label: "Manager", modules: ALL_MODULE_IDS },
  FRONT_DESK_SUPERVISOR: {
    label: "Front Desk Supervisor",
    modules: [...FRONT_DESK, "bookingengine", "rateplans", "restaurant", "banquet", "spa", "kiosk"],
  },
  RECEPTIONIST: { label: "Receptionist", modules: FRONT_DESK },
  ACCOUNTANT: {
    label: "Accountant",
    modules: ["dashboard", "finance", "reports", "compliance", "assets", "inventory", "vendors", "folio"],
  },
  HOUSEKEEPING: { label: "Housekeeping", modules: ["dashboard", "rooms", "housekeeping"] },
  NIGHT_AUDITOR: { label: "Night Auditor", modules: ["dashboard", "rooms", "bookings", "folio", "nightaudit", "reports"] },
  STAFF: { label: "Staff", modules: ["dashboard"] },
};

/** Effective module access for a user (before entitlement locking is applied). */
export function effectiveModulesFor(user: Pick<AuthUser, "role" | "allowedModules">): string[] {
  if (user.role === "OWNER") return ROLES.OWNER.modules;
  if (Array.isArray(user.allowedModules)) return user.allowedModules;
  return ROLES[user.role]?.modules ?? ["dashboard"];
}
