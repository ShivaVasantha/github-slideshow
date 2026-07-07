import { Prisma } from "@prisma/client";

/**
 * Money helpers. We keep all rupee amounts as plain numbers rounded to two
 * decimals (paise) inside the domain layer, and convert to/from Prisma's
 * Decimal at the persistence boundary. Every arithmetic result that becomes a
 * stored amount is passed through `round2` so we never accumulate float dust.
 */

export function round2(n: number): number {
  // Guard against binary-float artefacts like 0.1 + 0.2 by nudging before round.
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Convert a Prisma Decimal (or number/string) to a rounded JS number. */
export function toNumber(
  value: Prisma.Decimal | number | string | null | undefined,
): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

/** Format as Indian Rupees, e.g. ₹1,23,456.00 */
export function formatINR(value: Prisma.Decimal | number | string): string {
  const n = toNumber(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Format a plain number with Indian grouping, no currency symbol. */
export function formatNumberIN(value: Prisma.Decimal | number | string): string {
  const n = toNumber(value);
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
