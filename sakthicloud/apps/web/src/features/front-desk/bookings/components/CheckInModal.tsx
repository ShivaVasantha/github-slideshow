import { useMemo, useState, type FormEvent } from "react";
import { CheckInRequest } from "@sakthicloud/shared";
import { useRooms } from "../../rooms/hooks";
import { useCheckIn } from "../hooks";
import { useToast } from "@/components/Toast";
import { ApiError } from "@/lib/api-client";

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function CheckInModal({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
  const toast = useToast();
  const { data: rooms = [] } = useRooms(propertyId);
  const checkInMut = useCheckIn(propertyId);

  const available = useMemo(() => rooms.filter((r) => r.status === "available"), [rooms]);

  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [checkIn, setCheckInDate] = useState(todayPlus(0));
  const [checkOut, setCheckOutDate] = useState(todayPlus(1));
  const [billingAC, setBillingAC] = useState(true);
  const [advancePayment, setAdvance] = useState("0");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = CheckInRequest.safeParse({
      roomId,
      guest: { name, phone, idNumber, idType: "Aadhaar", nationality: "Indian" },
      checkIn,
      checkOut,
      billingAC,
      advancePayment: Number(advancePayment) || 0,
      paymentMode: "UPI",
      bookingSource: "Walk-in",
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    try {
      await checkInMut.mutateAsync(parsed.data);
      toast("success", "Guest checked in");
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Check-in failed");
    }
  }

  return (
    <div className="sc-modal__backdrop" onClick={onClose}>
      <form className="sc-modal" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <h2 className="sc-modal__title">New check-in</h2>

        <label className="sc-field">
          <span>Room</span>
          <select className="sc-select" value={roomId} onChange={(e) => setRoomId(e.target.value)} required>
            <option value="">Select an available room…</option>
            {available.map((r) => (
              <option key={r.id} value={r.id}>
                {r.number} · {r.type} · ₹{r.rate.toLocaleString("en-IN")}
              </option>
            ))}
          </select>
        </label>

        <div className="sc-grid2">
          <label className="sc-field"><span>Guest name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label className="sc-field"><span>Phone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required /></label>
        </div>

        <label className="sc-field"><span>ID number</span>
          <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} required /></label>

        <div className="sc-grid2">
          <label className="sc-field"><span>Check-in</span>
            <input type="date" value={checkIn} onChange={(e) => setCheckInDate(e.target.value)} required /></label>
          <label className="sc-field"><span>Check-out</span>
            <input type="date" value={checkOut} onChange={(e) => setCheckOutDate(e.target.value)} required /></label>
        </div>

        <div className="sc-grid2">
          <label className="sc-field"><span>Advance (₹)</span>
            <input type="number" min="0" value={advancePayment} onChange={(e) => setAdvance(e.target.value)} /></label>
          <label className="sc-field sc-field--inline">
            <input type="checkbox" checked={billingAC} onChange={(e) => setBillingAC(e.target.checked)} />
            <span>AC tariff</span>
          </label>
        </div>

        {available.length === 0 && <div className="sc-login__error">No rooms are currently available.</div>}
        {error && <div className="sc-login__error">{error}</div>}

        <div className="sc-modal__actions">
          <button type="button" className="sc-btn sc-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="sc-btn sc-btn--primary" disabled={checkInMut.isPending}>
            {checkInMut.isPending ? "Checking in…" : "Check in"}
          </button>
        </div>
      </form>
    </div>
  );
}
