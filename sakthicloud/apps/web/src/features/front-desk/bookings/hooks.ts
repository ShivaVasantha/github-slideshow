import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { BookingStatus, CheckInRequest, CheckOutRequest } from "@sakthicloud/shared";
import { invalidateOn } from "@/lib/ws";
import { roomKeys } from "../rooms/api";
import { bookingKeys, fetchBookings, checkIn, checkOut } from "./api";

export function useBookings(propertyId: string | null, status?: BookingStatus) {
  const query = useQuery({
    queryKey: bookingKeys.list(propertyId ?? "none", status),
    queryFn: () => fetchBookings(propertyId!, status),
    enabled: !!propertyId,
  });

  useEffect(() => {
    if (!propertyId) return;
    // A booking change on any device (check-in/out) refreshes every board.
    return invalidateOn("booking:updated", bookingKeys.list(propertyId, status));
  }, [propertyId, status]);

  return query;
}

// Check-in and check-out both move a room between available/occupied, so they
// invalidate BOTH the bookings and rooms caches — the room board stays truthful.
export function useCheckIn(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CheckInRequest) => checkIn(propertyId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bookingKeys.all });
      void qc.invalidateQueries({ queryKey: roomKeys.list(propertyId) });
    },
  });
}

export function useCheckOut(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, body }: { bookingId: string; body: CheckOutRequest }) =>
      checkOut(bookingId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bookingKeys.all });
      void qc.invalidateQueries({ queryKey: roomKeys.list(propertyId) });
    },
  });
}
