import { useMemo, useState } from "react";
import { FOLIO_CATEGORIES, type Booking, type FolioLine } from "@sakthicloud/shared";
import { useAuth } from "@/app/auth-context";
import { useBookings } from "../bookings/hooks";

// The running bill per in-house guest. Room charge + GST come from the booking
// (real, server-persisted). Incidental lines are session-local for now — the
// same honest caveat as the prototype — until folio_line / folio_payment land
// (see packages/shared/schemas/folio.ts and the persistence backlog).

type LocalLine = Pick<FolioLine, "id" | "category" | "description" | "amount" | "gstRate">;

export function FolioPage() {
  const { session } = useAuth();
  const propertyId = session?.activePropertyId ?? null;
  const { data: inHouse = [], isLoading } = useBookings(propertyId, "CHECKED_IN");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lines, setLines] = useState<Record<string, LocalLine[]>>({});

  const selected = inHouse.find((b) => b.id === selectedId) ?? inHouse[0] ?? null;

  if (!propertyId) return <div className="sc-empty">Select a property to view folios.</div>;
  if (isLoading) return <div className="sc-loading">Loading folios…</div>;
  if (inHouse.length === 0) return <div className="sc-empty">No in-house guests right now.</div>;

  return (
    <div className="sc-folio">
      <aside className="sc-folio__list">
        {inHouse.map((b) => (
          <button
            key={b.id}
            className={"sc-folio__guest" + ((selected?.id === b.id) ? " sc-folio__guest--active" : "")}
            onClick={() => setSelectedId(b.id)}
          >
            <div className="sc-cell-strong">{b.guestName}</div>
            <div className="sc-cell-dim">Room {b.roomNumber} · bal ₹{b.balanceDue.toLocaleString("en-IN")}</div>
          </button>
        ))}
      </aside>

      {selected && (
        <FolioDetail
          booking={selected}
          lines={lines[selected.id] ?? []}
          onAdd={(line) => setLines((m) => ({ ...m, [selected.id]: [...(m[selected.id] ?? []), line] }))}
        />
      )}
    </div>
  );
}

function FolioDetail({
  booking,
  lines,
  onAdd,
}: {
  booking: Booking;
  lines: LocalLine[];
  onAdd: (line: LocalLine) => void;
}) {
  const [category, setCategory] = useState<(typeof FOLIO_CATEGORIES)[number]>("Food & Beverage");
  const [amount, setAmount] = useState("");
  const [gstRate, setGstRate] = useState("5");

  const incidentalTotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.amount + (l.amount * l.gstRate) / 100, 0),
    [lines],
  );
  const grand = booking.grandTotal + incidentalTotal;
  const balance = grand - booking.advancePayment;

  function add() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    onAdd({ id: `local-${Date.now()}`, category, description: "", amount: amt, gstRate: Number(gstRate) || 0 });
    setAmount("");
  }

  return (
    <section className="sc-folio__detail">
      <header>
        <h1>{booking.guestName}</h1>
        <div className="sc-cell-dim">Room {booking.roomNumber} · {booking.roomType} · {booking.nights} nights</div>
      </header>

      <table className="sc-table">
        <tbody>
          <tr><td>Room charge (incl. GST)</td><td className="sc-num">₹{booking.grandTotal.toLocaleString("en-IN")}</td></tr>
          {lines.map((l) => (
            <tr key={l.id}>
              <td>{l.category} <span className="sc-cell-dim">+{l.gstRate}% GST</span></td>
              <td className="sc-num">₹{(l.amount + (l.amount * l.gstRate) / 100).toLocaleString("en-IN")}</td>
            </tr>
          ))}
          <tr className="sc-table__total"><td>Grand total</td><td className="sc-num">₹{grand.toLocaleString("en-IN")}</td></tr>
          <tr><td>Advance paid</td><td className="sc-num">− ₹{booking.advancePayment.toLocaleString("en-IN")}</td></tr>
          <tr className="sc-table__total"><td>Balance due</td><td className="sc-num">₹{balance.toLocaleString("en-IN")}</td></tr>
        </tbody>
      </table>

      <div className="sc-folio__post">
        <select className="sc-select" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
          {FOLIO_CATEGORIES.filter((c) => c !== "Room Charge").map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className="sc-select" type="number" min="0" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <select className="sc-select" value={gstRate} onChange={(e) => setGstRate(e.target.value)}>
          <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option>
        </select>
        <button className="sc-btn sc-btn--primary" onClick={add}>Post charge</button>
      </div>
      <p className="sc-cell-dim sc-folio__note">
        Incidental charges are session-local until the folio_line / folio_payment tables land. Room
        charge and advance are server-persisted from the booking.
      </p>
    </section>
  );
}
