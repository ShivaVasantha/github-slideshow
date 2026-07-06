import { api } from "@/lib/api-client";
import { Room, type RoomApiRow, type UpdateRoomRequest } from "@sakthicloud/shared";

// Query keys — colocated so cache invalidation (manual + via WS) is unambiguous.
export const roomKeys = {
  all: ["rooms"] as const,
  list: (propertyId: string) => ["rooms", "list", propertyId] as const,
};

function num(v: string | number | null | undefined, fallback = 0): number {
  if (v == null) return fallback;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : fallback;
}

// Flatten the nested Prisma row (roomType, bookings[]) into the app-facing Room.
// This is the prototype's mapRoom(), now typed and validated once at the boundary.
function flatten(row: RoomApiRow): Room {
  const booking = (row.bookings ?? [])[0] as
    | { guest?: Record<string, unknown>; checkIn?: string; checkOut?: string; adults?: number; children?: number; advancePayment?: number; paymentMode?: string; purpose?: string; id?: string }
    | undefined;
  const g = booking?.guest;

  const shaped = {
    id: row.id,
    number: row.number,
    type: row.roomType?.name ?? "Standard",
    propertyId: row.propertyId,
    floor: row.floor ?? "",
    rate: num(row.currentRate ?? row.roomType?.rateAC),
    rateAC: num(row.roomType?.rateAC),
    rateNonAC: num(row.roomType?.rateNonAC),
    gstRate: num(row.roomType?.gstRate, 12),
    status: (row.status ?? "AVAILABLE").toLowerCase(),
    cleanStatus: (row.cleanStatus ?? "CLEAN").toLowerCase(),
    amenities: row.roomType?.amenities ?? ["AC", "TV", "Wi-Fi"],
    notes: row.notes ?? "",
    guest: g
      ? {
          name: String(g.name ?? ""),
          phone: String(g.phone ?? ""),
          email: String(g.email ?? ""),
          idType: String(g.idType ?? "Aadhaar"),
          idNumber: String(g.idNumber ?? ""),
          nationality: String(g.nationality ?? "Indian"),
          adults: Number(booking?.adults ?? 1),
          children: Number(booking?.children ?? 0),
          checkIn: (booking?.checkIn ?? "").split("T")[0],
          checkOut: (booking?.checkOut ?? "").split("T")[0],
          advancePayment: Number(booking?.advancePayment ?? 0),
          paymentMode: String(booking?.paymentMode ?? "UPI"),
          purpose: String(booking?.purpose ?? "Business"),
          bookingId: booking?.id,
        }
      : null,
  };
  // Validate at the trust boundary; downstream code gets a fully-typed Room.
  return Room.parse(shaped);
}

export async function fetchRooms(propertyId: string): Promise<Room[]> {
  const rows = await api.get<RoomApiRow[]>(`/properties/${propertyId}/rooms`);
  return (rows ?? []).map(flatten);
}

export async function updateRoom(
  propertyId: string,
  roomId: string,
  patch: UpdateRoomRequest,
): Promise<void> {
  await api.put(`/properties/${propertyId}/rooms/${roomId}`, patch);
}
