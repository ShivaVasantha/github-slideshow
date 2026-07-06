import { z } from "zod";

export const BookingStatus = z.enum(["RESERVED", "CHECKED_IN", "CHECKED_OUT"]);
export type BookingStatus = z.infer<typeof BookingStatus>;

export const Guest = z.object({
  name: z.string(),
  phone: z.string(),
  email: z.string().optional().default(""),
  company: z.string().optional(),
  idType: z.string().optional().default("Aadhaar"),
  idNumber: z.string().optional().default(""),
  idImage: z.string().optional(),
  nationality: z.string().optional().default("Indian"),
  adults: z.number().int().positive().default(1),
  children: z.number().int().nonnegative().default(0),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  advancePayment: z.number().nonnegative().default(0),
  paymentMode: z.string().optional().default("UPI"),
  purpose: z.string().optional().default("Business"),
  bookingId: z.string().optional(),
});
export type Guest = z.infer<typeof Guest>;

// ── Check-in ── (matches backend checkInSchema exactly)
export const CheckInRequest = z.object({
  roomId: z.string(),
  guest: z.object({
    name: z.string().min(2),
    phone: z.string().min(10),
    email: z.string().email().optional(),
    company: z.string().optional(),
    idType: z.string().default("Aadhaar"),
    idNumber: z.string().min(4),
    idImage: z.string().optional(),
    nationality: z.string().default("Indian"),
  }),
  checkIn: z.string(),
  checkOut: z.string(),
  billingAC: z.boolean().default(true),
  adults: z.number().int().min(1).default(1),
  children: z.number().int().min(0).default(0),
  advancePayment: z.number().min(0).default(0),
  paymentMode: z.string().default("UPI"),
  bookingSource: z.string().default("Walk-in"),
  purpose: z.string().optional(),
  notes: z.string().optional(),
});
export type CheckInRequest = z.infer<typeof CheckInRequest>;

// ── Check-out ── (matches backend checkOutSchema)
export const CheckOutRequest = z.object({
  extras: z
    .array(z.object({ description: z.string(), amount: z.number().positive() }))
    .default([]),
  discount: z.number().min(0).default(0),
  paymentMode: z.string().default("UPI"),
  sendWhatsApp: z.boolean().default(false),
  sendEmail: z.boolean().default(false),
});
export type CheckOutRequest = z.infer<typeof CheckOutRequest>;

// ── Booking (app-facing, flattened from the list response) ──
export const Booking = z.object({
  id: z.string(),
  status: BookingStatus,
  guestName: z.string(),
  guestPhone: z.string(),
  roomId: z.string().nullable(),
  roomNumber: z.string(),
  roomType: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  nights: z.number().int().nonnegative(),
  adults: z.number().int().nonnegative(),
  children: z.number().int().nonnegative(),
  grandTotal: z.number().nonnegative(),
  advancePayment: z.number().nonnegative(),
  balanceDue: z.number(),
  bookingSource: z.string(),
});
export type Booking = z.infer<typeof Booking>;

// Raw row from GET /properties/:id/bookings (subset relied upon).
export const BookingApiRow = z.object({
  id: z.string(),
  status: z.string(),
  checkIn: z.string().nullish(),
  checkOut: z.string().nullish(),
  adults: z.number().nullish(),
  children: z.number().nullish(),
  grandTotal: z.union([z.string(), z.number()]).nullish(),
  advancePayment: z.union([z.string(), z.number()]).nullish(),
  balanceDue: z.union([z.string(), z.number()]).nullish(),
  bookingSource: z.string().nullish(),
  guest: z.object({ name: z.string().nullish(), phone: z.string().nullish() }).nullish(),
  room: z
    .object({ number: z.string().nullish(), roomType: z.object({ name: z.string().nullish() }).nullish() })
    .nullish(),
});
export type BookingApiRow = z.infer<typeof BookingApiRow>;

export const BookingsListResponse = z.object({
  bookings: z.array(BookingApiRow),
  total: z.number(),
  page: z.number(),
  pages: z.number(),
});
export type BookingsListResponse = z.infer<typeof BookingsListResponse>;
