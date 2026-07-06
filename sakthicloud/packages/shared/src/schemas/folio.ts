import { z } from "zod";

// Folio contract for the persistence backlog (folio_line, folio_payment).
// The prototype held these in React state; defining the schema here is step 1
// of migrating the module. The Folio page can already render a running bill
// derived from the booking (room charge + GST); incidental lines + payments
// persist once the backend tables land. Payments post to the ledger today.

export const FOLIO_CATEGORIES = [
  "Room Charge",
  "Food & Beverage",
  "Minibar",
  "Laundry",
  "Spa & Wellness",
  "Telephone / Internet",
  "Airport Transfer",
  "Extra Bed",
  "Room Service",
  "Restaurant / F&B",
  "Damage / Penalty",
  "Misc",
] as const;

export const FolioTarget = z.enum(["guest", "company"]);
export type FolioTarget = z.infer<typeof FolioTarget>;

export const FolioLine = z.object({
  id: z.string(),
  category: z.enum(FOLIO_CATEGORIES),
  description: z.string().default(""),
  amount: z.number().nonnegative(),
  gstRate: z.number().nonnegative().default(12),
  target: FolioTarget.default("guest"),
  postedAt: z.string(),
});
export type FolioLine = z.infer<typeof FolioLine>;

export const FolioPayment = z.object({
  id: z.string(),
  amount: z.number().nonnegative(),
  mode: z.string(),
  target: FolioTarget.default("guest"),
  paidAt: z.string(),
});
export type FolioPayment = z.infer<typeof FolioPayment>;

export const PostChargeRequest = FolioLine.omit({ id: true, postedAt: true });
export type PostChargeRequest = z.infer<typeof PostChargeRequest>;

export const RecordPaymentRequest = FolioPayment.omit({ id: true, paidAt: true });
export type RecordPaymentRequest = z.infer<typeof RecordPaymentRequest>;
