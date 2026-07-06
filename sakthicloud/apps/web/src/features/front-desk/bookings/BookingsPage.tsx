import { useState } from "react";
import { BookingStatus, type Booking } from "@sakthicloud/shared";
import { useAuth } from "@/app/auth-context";
import { useToast } from "@/components/Toast";
import { useBookings, useCheckOut } from "./hooks";
import { CheckInModal } from "./components/CheckInModal";

const FILTERS: { label: string; value: BookingStatus | undefined }[] = [
  { label: "All", value: undefined },
  { label: "In-house", value: "CHECKED_IN" },
  { label: "Reserved", value: "RESERVED" },
  { label: "Departed", value: "CHECKED_OUT" },
];

export function BookingsPage() {
  const { session } = useAuth();
  const toast = useToast();
  const propertyId = session?.activePropertyId ?? null;

  const [filter, setFilter] = useState<BookingStatus | undefined>(undefined);
  const [showCheckIn, setShowCheckIn] = useState(false);

  const { data: bookings = [], isLoading, isError, error } = useBookings(propertyId, filter);
  const checkOutMut = useCheckOut(propertyId ?? "");

  function checkout(b: Booking) {
    if (!confirm(`Check out ${b.guestName} from room ${b.roomNumber}?`)) return;
    checkOutMut.mutate(
      { bookingId: b.id, body: { extras: [], discount: 0, paymentMode: "UPI", sendWhatsApp: false, sendEmail: false } },
      {
        onSuccess: () => toast("success", "Checked out"),
        onError: (e) => toast("error", e instanceof Error ? e.message : "Checkout failed"),
      },
    );
  }

  if (!propertyId) return <div className="sc-empty">Select a property to view bookings.</div>;

  return (
    <div className="sc-bookings">
      <header className="sc-rooms__head">
        <h1>Bookings</h1>
        <div className="sc-bookings__bar">
          <div className="sc-filters">
            {FILTERS.map((f) => (
              <button
                key={f.label}
                className={"sc-pill" + (filter === f.value ? " sc-pill--active" : "")}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button className="sc-btn sc-btn--primary" onClick={() => setShowCheckIn(true)}>
            + Check-in
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="sc-loading">Loading bookings…</div>
      ) : isError ? (
        <div className="sc-empty sc-empty--error">
          Couldn’t load bookings: {error instanceof Error ? error.message : "unknown error"}
        </div>
      ) : bookings.length === 0 ? (
        <div className="sc-empty">No bookings match this filter.</div>
      ) : (
        <div className="sc-table__wrap">
          <table className="sc-table">
            <thead>
              <tr>
                <th>Guest</th><th>Room</th><th>Stay</th><th>Nights</th>
                <th className="sc-num">Total</th><th className="sc-num">Balance</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div className="sc-cell-strong">{b.guestName}</div>
                    <div className="sc-cell-dim">{b.guestPhone}</div>
                  </td>
                  <td>{b.roomNumber} · {b.roomType}</td>
                  <td className="sc-cell-dim">{b.checkIn} → {b.checkOut}</td>
                  <td>{b.nights}</td>
                  <td className="sc-num">₹{b.grandTotal.toLocaleString("en-IN")}</td>
                  <td className="sc-num">₹{b.balanceDue.toLocaleString("en-IN")}</td>
                  <td><span className={`sc-badge sc-badge--status-${b.status}`}>{b.status.replace("_", " ").toLowerCase()}</span></td>
                  <td>
                    {b.status === "CHECKED_IN" && (
                      <button className="sc-btn sc-btn--ghost" onClick={() => checkout(b)} disabled={checkOutMut.isPending}>
                        Check out
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCheckIn && <CheckInModal propertyId={propertyId} onClose={() => setShowCheckIn(false)} />}
    </div>
  );
}
