import { differenceInCalendarDays } from "date-fns";

/**
 * Compliance expiry status shared by the vehicle, customer and compliance
 * pages. A document is "expiring soon" within `soonDays` (default 45) of today.
 */

export type ComplianceLevel = "none" | "ok" | "soon" | "expired";

export interface ComplianceStatus {
  level: ComplianceLevel;
  days: number | null; // days until expiry (negative if expired)
  label: string;
}

export function complianceStatus(
  expiry: Date | null | undefined,
  soonDays = 45,
  asOf: Date = new Date(),
): ComplianceStatus {
  if (!expiry) return { level: "none", days: null, label: "—" };
  const days = differenceInCalendarDays(new Date(expiry), asOf);
  if (days < 0) return { level: "expired", days, label: `expired ${-days}d ago` };
  if (days <= soonDays) return { level: "soon", days, label: `in ${days}d` };
  return { level: "ok", days, label: `in ${days}d` };
}

export const COMPLIANCE_DOCS = [
  { key: "insurance", label: "Insurance", field: "insuranceExpiry" },
  { key: "fitness", label: "Fitness", field: "fitnessExpiry" },
  { key: "permit", label: "Permit", field: "permitExpiry" },
] as const;

export type ComplianceDocKey = (typeof COMPLIANCE_DOCS)[number]["key"];

/** Tailwind text classes for a level (used consistently across pages). */
export function complianceTone(level: ComplianceLevel): string {
  switch (level) {
    case "expired":
      return "text-rose-600 font-medium";
    case "soon":
      return "text-amber-600 font-medium";
    case "ok":
      return "text-slate-600";
    default:
      return "text-slate-400";
  }
}
