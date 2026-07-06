import type { Room, RoomStatus } from "@sakthicloud/shared";

const STATUS_LABEL: Record<RoomStatus, string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
  maintenance: "Maintenance",
};

export function RoomCard({
  room,
  onCycleClean,
  busy,
}: {
  room: Room;
  onCycleClean: (room: Room) => void;
  busy: boolean;
}) {
  return (
    <div className={`sc-room sc-room--${room.status}`}>
      <div className="sc-room__top">
        <span className="sc-room__number">{room.number}</span>
        <span className={`sc-badge sc-badge--${room.status}`}>{STATUS_LABEL[room.status]}</span>
      </div>
      <div className="sc-room__type">{room.type}</div>
      <div className="sc-room__rate">₹{room.rate.toLocaleString("en-IN")}/night</div>

      {room.guest ? (
        <div className="sc-room__guest">
          <div className="sc-room__guest-name">{room.guest.name}</div>
          <div className="sc-room__guest-meta">
            {room.guest.checkOut ? `Out ${room.guest.checkOut}` : ""}
          </div>
        </div>
      ) : (
        <div className="sc-room__guest sc-room__guest--empty">No guest</div>
      )}

      <button
        className="sc-btn sc-btn--ghost sc-room__clean"
        onClick={() => onCycleClean(room)}
        disabled={busy}
      >
        Housekeeping: {room.cleanStatus}
      </button>
    </div>
  );
}
