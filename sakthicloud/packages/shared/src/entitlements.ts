// ═══════════════════════════════════════════════════════════
// SaaS ENTITLEMENTS — the single source of truth, shared by web + api.
// Core = Front Desk + Housekeeping (a complete, compliant PMS on its own).
// Everything else is a per-property, per-month add-on.
// Ported verbatim from the prototype's ADDON_CATALOG so the contract
// never drifts between frontend gating and backend requireEntitlement().
// Prices are INDICATIVE placeholders — set real pricing before launch.
// ═══════════════════════════════════════════════════════════

export interface AddonDef {
  id: string;
  label: string;
  desc: string;
  modules: string[];
  price: number;
  soon?: boolean;
}

export interface RoomBand {
  id: string;
  label: string;
  price: number;
}

export const ADDON_CATALOG: AddonDef[] = [
  { id: "revenue", label: "Revenue & Direct Bookings", desc: "Dynamic rate plans, seasons, promos and meal plans, plus your own commission-free booking website with Razorpay.", modules: ["bookingengine", "rateplans"], price: 1299 },
  { id: "accounting", label: "Accounting & Finance", desc: "Full books — P&L, departmental GOP, GST returns, TDS, RCM, depreciation, balance sheet and owner statements.", modules: ["finance"], price: 1499 },
  { id: "crm", label: "Guest CRM & Marketing", desc: "Guest segmentation, one-tap WhatsApp templates and campaigns, and a loyalty programme.", modules: ["guestcrm", "loyalty"], price: 999 },
  { id: "staff", label: "Staff, Payroll & Performance", desc: "Roster and payroll, plus deadline- and rating-based employee performance across every department.", modules: ["staff", "performance"], price: 999 },
  { id: "assets", label: "Assets & Inventory", desc: "Asset lifecycle and depreciation, stock control with amenity formats, and vendor management.", modules: ["assets", "inventory", "vendors"], price: 899 },
  { id: "selfservice", label: "Guest Self-Service", desc: "Reception kiosk, web check-in, and in-room Wi-Fi / TV ordering.", modules: ["kiosk", "wifi", "tv"], price: 1199 },
  { id: "ai", label: "Specter AI", desc: "An AI co-pilot across your whole property. Usage-metered on top of any plan.", modules: ["copilot"], price: 799 },
  { id: "banquet", label: "Banquet & Events", desc: "Configurable halls billed hourly or daily, event orders (BEO), advances and setup tasks — all through the GST folio.", modules: ["banquet"], price: 1199 },
  { id: "restaurant", label: "Restaurant & Café POS", desc: "Table-service POS with a menu, KOT to the kitchen, running table bills, and pay-at-table or charge-to-room settlement at 5% F&B GST.", modules: ["restaurant", "kitchen", "kitcheninv"], price: 1299 },
  { id: "spa", label: "Spa & Wellness", desc: "Appointment booking for spa and salon services with therapist scheduling, and pay-at-desk or charge-to-room settlement at 18% GST.", modules: ["spa"], price: 999 },
  { id: "channel", label: "Channel Manager", desc: "Two-way inventory and rate sync with OTAs (Booking.com, MakeMyTrip, Agoda).", modules: ["channels"], price: 1999, soon: true },
];

export const ROOM_BANDS: RoomBand[] = [
  { id: "1-20", label: "Up to 20 rooms", price: 1999 },
  { id: "21-50", label: "21–50 rooms", price: 3499 },
  { id: "51-100", label: "51–100 rooms", price: 5999 },
  { id: "100+", label: "100+ rooms", price: 8999 },
];

// module -> add-on id. Anything not present here is Core (always allowed).
export const MODULE_ADDON: Record<string, string> = ADDON_CATALOG.reduce(
  (acc, addon) => {
    for (const m of addon.modules) acc[m] = addon.id;
    return acc;
  },
  {} as Record<string, string>,
);

export function moduleAddonId(moduleId: string): string | null {
  return MODULE_ADDON[moduleId] ?? null;
}

export function isCoreModule(moduleId: string): boolean {
  return !MODULE_ADDON[moduleId];
}

export interface Subscription {
  plan: string;
  addons: string[];
  roomBand: string;
}

/** A module is locked when it belongs to an add-on the tenant hasn't purchased. */
export function isModuleLocked(moduleId: string, subscription: Subscription | null | undefined): boolean {
  const addon = MODULE_ADDON[moduleId];
  if (!addon) return false; // Core module — always available
  return !(subscription?.addons ?? []).includes(addon);
}
