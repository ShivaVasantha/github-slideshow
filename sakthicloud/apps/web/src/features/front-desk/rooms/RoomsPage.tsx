import { useMemo } from "react";
import type { Room, CleanStatus } from "@sakthicloud/shared";
import { useAuth } from "@/app/auth-context";
import { useToast } from "@/components/Toast";
import { useRooms, useUpdateRoom } from "./hooks";
import { RoomCard } from "./components/RoomCard";

const CLEAN_CYCLE: Record<CleanStatus, CleanStatus> = {
  dirty: "clean",
  clean: "inspected",
  inspected: "dirty",
};

export function RoomsPage() {
  const { session } = useAuth();
  const toast = useToast();
  const propertyId = session?.activePropertyId ?? null;

  const { data: rooms = [], isLoading, isError, error } = useRooms(propertyId);
  const update = useUpdateRoom(propertyId ?? "");

  const stats = useMemo(() => {
    const total = rooms.length;
    const occupied = rooms.filter((r) => r.status === "occupied").length;
    const dirty = rooms.filter((r) => r.cleanStatus === "dirty").length;
    const occupancy = total ? Math.round((occupied / total) * 100) : 0;
    return { total, occupied, dirty, occupancy };
  }, [rooms]);

  function cycleClean(room: Room) {
    update.mutate(
      { roomId: room.id, patch: { cleanStatus: CLEAN_CYCLE[room.cleanStatus] } },
      { onError: (e) => toast("error", e instanceof Error ? e.message : "Update failed") },
    );
  }

  if (!propertyId) return <div className="sc-empty">Select a property to view rooms.</div>;
  if (isLoading) return <div className="sc-loading">Loading rooms…</div>;
  if (isError) {
    return (
      <div className="sc-empty sc-empty--error">
        Couldn’t load rooms: {error instanceof Error ? error.message : "unknown error"}
      </div>
    );
  }

  return (
    <div className="sc-rooms">
      <header className="sc-rooms__head">
        <h1>Rooms</h1>
        <div className="sc-statrow">
          <Stat label="Rooms" value={stats.total} />
          <Stat label="Occupied" value={stats.occupied} />
          <Stat label="Occupancy" value={`${stats.occupancy}%`} />
          <Stat label="Dirty" value={stats.dirty} />
        </div>
      </header>

      {rooms.length === 0 ? (
        <div className="sc-empty">No rooms configured for this property yet.</div>
      ) : (
        <div className="sc-rooms__grid">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} onCycleClean={cycleClean} busy={update.isPending} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="sc-stat">
      <div className="sc-stat__value">{value}</div>
      <div className="sc-stat__label">{label}</div>
    </div>
  );
}
