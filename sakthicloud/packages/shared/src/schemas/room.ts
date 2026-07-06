import { z } from "zod";
import { Guest } from "./booking";

export const RoomStatus = z.enum(["available", "occupied", "reserved", "maintenance"]);
export type RoomStatus = z.infer<typeof RoomStatus>;

export const CleanStatus = z.enum(["clean", "dirty", "inspected"]);
export type CleanStatus = z.infer<typeof CleanStatus>;

// The app-facing Room shape (post-mapRoom in the prototype). The API returns
// a nested Prisma shape (roomType, bookings[]) which the fetcher flattens to this.
export const Room = z.object({
  id: z.string(),
  number: z.string(),
  type: z.string(),
  propertyId: z.string(),
  floor: z.string().optional().default(""),
  rate: z.number().nonnegative(),
  rateAC: z.number().nonnegative().default(0),
  rateNonAC: z.number().nonnegative().default(0),
  gstRate: z.number().default(12),
  status: RoomStatus,
  cleanStatus: CleanStatus,
  guest: Guest.nullable().default(null),
  amenities: z.array(z.string()).default([]),
  notes: z.string().optional().default(""),
});
export type Room = z.infer<typeof Room>;

// Raw API row (subset we rely on) — used to type the flattening step.
export const RoomApiRow = z.object({
  id: z.string(),
  number: z.string(),
  propertyId: z.string(),
  floor: z.string().nullish(),
  status: z.string().nullish(),
  cleanStatus: z.string().nullish(),
  currentRate: z.union([z.string(), z.number()]).nullish(),
  notes: z.string().nullish(),
  roomType: z
    .object({
      name: z.string().nullish(),
      rateAC: z.union([z.string(), z.number()]).nullish(),
      rateNonAC: z.union([z.string(), z.number()]).nullish(),
      gstRate: z.union([z.string(), z.number()]).nullish(),
      amenities: z.array(z.string()).nullish(),
    })
    .nullish(),
  bookings: z.array(z.any()).nullish(),
});
export type RoomApiRow = z.infer<typeof RoomApiRow>;

export const UpdateRoomRequest = Room.partial().omit({ id: true, propertyId: true, guest: true });
export type UpdateRoomRequest = z.infer<typeof UpdateRoomRequest>;
