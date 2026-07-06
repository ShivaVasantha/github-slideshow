import { z } from "zod";

export const Guest = z.object({
  name: z.string(),
  phone: z.string(),
  email: z.string().optional().default(""),
  idType: z.string().optional().default("Aadhaar"),
  idNumber: z.string().optional().default(""),
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

export const CheckInRequest = z.object({
  roomId: z.string(),
  guest: Guest,
});
export type CheckInRequest = z.infer<typeof CheckInRequest>;
