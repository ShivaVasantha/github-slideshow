"use client";

import { useActionState } from "react";
import { recordPayment } from "@/lib/actions/payments";

export function PaymentForm({
  loanId,
  suggestedAmount,
}: {
  loanId: string;
  suggestedAmount: number;
}) {
  const [state, action, pending] = useActionState(recordPayment, {});

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="loanId" value={loanId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="amount">
            Amount (₹)
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={suggestedAmount > 0 ? suggestedAmount.toFixed(2) : ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="mode">
            Mode
          </label>
          <select id="mode" name="mode" className="input" defaultValue="CASH">
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="CHEQUE">Cheque</option>
            <option value="CARD">Card</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="paidAt">
            Date
          </label>
          <input
            id="paidAt"
            name="paidAt"
            type="date"
            className="input"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div>
          <label className="label" htmlFor="reference">
            Reference
          </label>
          <input id="reference" name="reference" className="input" placeholder="UPI / cheque no." />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="note">
          Note
        </label>
        <input id="note" name="note" className="input" />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      )}
      {state?.ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.ok}</p>
      )}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Recording…" : "Record payment"}
      </button>
      <p className="text-xs text-slate-400">
        Applied in order: charges → interest → principal. A zero-overdue discount is
        granted automatically when the account is current.
      </p>
    </form>
  );
}
