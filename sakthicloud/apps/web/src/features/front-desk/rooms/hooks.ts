import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Room, UpdateRoomRequest } from "@sakthicloud/shared";
import { invalidateOn } from "@/lib/ws";
import { roomKeys, fetchRooms, updateRoom } from "./api";

// Replaces the prototype's `const [rooms, setRooms] = useState(seed)`.
// Server is the source of truth; the cache is shared across every device and
// receptionist, and survives refresh — the persistence fix, for free.
export function useRooms(propertyId: string | null) {
  const query = useQuery({
    queryKey: roomKeys.list(propertyId ?? "none"),
    queryFn: () => fetchRooms(propertyId!),
    enabled: !!propertyId,
  });

  // Live board: when any device changes a room, the server broadcasts and every
  // other device refetches — two receptionists share one live room board.
  useEffect(() => {
    if (!propertyId) return;
    const off = invalidateOn("room:updated", roomKeys.list(propertyId));
    return off;
  }, [propertyId]);

  return query;
}

export function useUpdateRoom(propertyId: string) {
  const qc = useQueryClient();
  const key = roomKeys.list(propertyId);

  return useMutation({
    mutationFn: ({ roomId, patch }: { roomId: string; patch: UpdateRoomRequest }) =>
      updateRoom(propertyId, roomId, patch),

    // Optimistic: the board feels instant and rolls back on error.
    onMutate: async ({ roomId, patch }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Room[]>(key);
      qc.setQueryData<Room[]>(key, (old) =>
        old?.map((r) => (r.id === roomId ? { ...r, ...patch } : r)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
    },
  });
}
