import { api } from "@/lib/api-client";
import {
  BookingsListResponse,
  Booking,
  type BookingApiRow,
  type BookingStatus,
  type CheckInRequest,
  type CheckOutRequest,
} from "@sakthicloud/shared";

export const bookingKeys = {
  all: ["bookings"] as const,
  list: (propertyId: string, status?: string) => ["bookings", "list", propertyId, status ?? "all"] as const,
};

function num(v: string | number | null | undefined, fallback = 0): number {
  if (v == null) return fallback;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : fallback;
}

function nightsBetween(inIso?: string | null, outIso?: string | null): number {
  if (!inIso || !outIso) return 0;
  const ms = new Date(outIso).getTime() - new Date(inIso).getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function flatten(row: BookingApiRow): Booking {
  return Booking.parse({
    id: row.id,
    status: row.status,
    guestName: row.guest?.name ?? "—",
    guestPhone: row.guest?.phone ?? "",
    roomId: null,
    roomNumber: row.room?.number ?? "—",
    roomType: row.room?.roomType?.name ?? "Standard",
    checkIn: (row.checkIn ?? "").split("T")[0],
    checkOut: (row.checkOut ?? "").split("T")[0],
    nights: nightsBetween(row.checkIn, row.checkOut),
    adults: num(row.adults, 1),
    children: num(row.children, 0),
    grandTotal: num(row.grandTotal),
    advancePayment: num(row.advancePayment),
    balanceDue: num(row.balanceDue),
    bookingSource: row.bookingSource ?? "Walk-in",
  });
}

export async function fetchBookings(propertyId: string, status?: BookingStatus): Promise<Booking[]> {
  const qs = status ? `?status=${status}` : "";
  const raw = await api.get<unknown>(`/properties/${propertyId}/bookings${qs}`);
  const parsed = BookingsListResponse.parse(raw);
  return parsed.bookings.map(flatten);
}

export async function checkIn(propertyId: string, body: CheckInRequest): Promise<void> {
  await api.post(`/properties/${propertyId}/bookings/checkin`, body);
}

export async function checkOut(bookingId: string, body: CheckOutRequest): Promise<void> {
  await api.post(`/bookings/${bookingId}/checkout`, body);
}
