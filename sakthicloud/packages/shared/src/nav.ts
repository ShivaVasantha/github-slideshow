// Navigation contract — the 32 modules grouped into 9 sections, ported
// verbatim from the prototype's ALL_NAV. Sections render in this order;
// a section header appears wherever `sec` changes down the list.

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  sec: SectionName;
}

export type SectionName =
  | "Overview"
  | "Front Office"
  | "Food & Beverage"
  | "Spa & Wellness"
  | "Operations"
  | "Finance"
  | "People & Guests"
  | "Distribution & In-Room"
  | "Setup";

export const SECTION_ORDER: SectionName[] = [
  "Overview",
  "Front Office",
  "Food & Beverage",
  "Spa & Wellness",
  "Operations",
  "Finance",
  "People & Guests",
  "Distribution & In-Room",
  "Setup",
];

export const ALL_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid", sec: "Overview" },
  { id: "copilot", label: "Specter", icon: "sparkles", sec: "Overview" },

  { id: "rooms", label: "Rooms", icon: "bed", sec: "Front Office" },
  { id: "bookings", label: "Bookings", icon: "calendar-check", sec: "Front Office" },
  { id: "folio", label: "Folios", icon: "receipt", sec: "Front Office" },
  { id: "tapechart", label: "Calendar", icon: "calendar", sec: "Front Office" },
  { id: "nightaudit", label: "Night Audit", icon: "moon", sec: "Front Office" },
  { id: "bookingengine", label: "Booking Engine", icon: "globe", sec: "Front Office" },
  { id: "rateplans", label: "Rate Plans", icon: "tag", sec: "Front Office" },
  { id: "kiosk", label: "Reception Kiosk", icon: "tablet", sec: "Front Office" },

  { id: "restaurant", label: "Restaurant", icon: "utensils", sec: "Food & Beverage" },
  { id: "kitchen", label: "Kitchen (KDS)", icon: "bell", sec: "Food & Beverage" },
  { id: "kitcheninv", label: "Kitchen Inventory", icon: "boxes", sec: "Food & Beverage" },
  { id: "banquet", label: "Banquet & Events", icon: "party", sec: "Food & Beverage" },

  { id: "spa", label: "Spa & Wellness", icon: "flower", sec: "Spa & Wellness" },

  { id: "housekeeping", label: "Housekeeping", icon: "broom", sec: "Operations" },
  { id: "assets", label: "Assets", icon: "wrench", sec: "Operations" },
  { id: "inventory", label: "Inventory", icon: "boxes", sec: "Operations" },
  { id: "vendors", label: "Vendors", icon: "truck", sec: "Operations" },

  { id: "finance", label: "Finance & Accounts", icon: "book", sec: "Finance" },
  { id: "compliance", label: "Compliance", icon: "shield", sec: "Finance" },
  { id: "reports", label: "Reports", icon: "chart", sec: "Finance" },

  { id: "staff", label: "Staff & Payroll", icon: "users", sec: "People & Guests" },
  { id: "performance", label: "Performance", icon: "chart", sec: "People & Guests" },
  { id: "guestcrm", label: "Guests", icon: "heart", sec: "People & Guests" },
  { id: "loyalty", label: "Loyalty", icon: "star", sec: "People & Guests" },

  { id: "channels", label: "Channel Manager", icon: "share", sec: "Distribution & In-Room" },
  { id: "wifi", label: "Wi-Fi", icon: "wifi", sec: "Distribution & In-Room" },
  { id: "tv", label: "In-Room TVs", icon: "tv", sec: "Distribution & In-Room" },

  { id: "properties", label: "Properties", icon: "building", sec: "Setup" },
  { id: "users", label: "User Management", icon: "user-cog", sec: "Setup" },
  { id: "branding", label: "Branding", icon: "palette", sec: "Setup" },
  { id: "subscription", label: "Plan & Billing", icon: "credit-card", sec: "Setup" },
];
