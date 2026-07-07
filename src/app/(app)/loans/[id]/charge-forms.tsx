"use client";

import { useActionState } from "react";
import { addCharge, applyPenalty, waiveCharge } from "@/lib/actions/charges";

export function AddChargeForm({ loanId }: { loanId: string }) {
  const [state, action, pending] = useActionState(addCharge, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="loanId" value={loanId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="ctype">
            Type
          </label>
          <select id="ctype" name="type" className="input" defaultValue="TOWING">
            <option value="LATE_PENALTY">Late penalty</option>
            <option value="OVERDUE_INTEREST">Overdue interest</option>
            <option value="TOWING">Towing</option>
            <option value="COLLECTION">Collection effort</option>
            <option value="LEGAL">Legal expense</option>
            <option value="BOUNCE">Cheque bounce</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="camount">
            Amount (₹)
          </label>
          <input id="camount" name="amount" type="number" step="0.01" min="0" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="cdesc">
            Description
          </label>
          <input id="cdesc" name="description" className="input" />
        </div>
      </div>
      {state?.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      )}
      {state?.ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.ok}</p>
      )}
      <button type="submit" className="btn-secondary" disabled={pending}>
        {pending ? "Adding…" : "Add charge"}
      </button>
    </form>
  );
}

export function ApplyPenaltyButton({ loanId }: { loanId: string }) {
  const [state, action, pending] = useActionState(applyPenalty, {});
  return (
    <form action={action} className="inline">
      <input type="hidden" name="loanId" value={loanId} />
      <button type="submit" className="btn-secondary text-xs" disabled={pending}>
        {pending ? "Calculating…" : "Auto-apply late penalty"}
      </button>
      {state?.error && <span className="ml-2 text-xs text-rose-600">{state.error}</span>}
      {state?.ok && <span className="ml-2 text-xs text-emerald-600">{state.ok}</span>}
    </form>
  );
}

export function WaiveChargeButton({ chargeId, loanId }: { chargeId: string; loanId: string }) {
  const [, action, pending] = useActionState(waiveCharge, {});
  return (
    <form action={action} className="inline">
      <input type="hidden" name="chargeId" value={chargeId} />
      <input type="hidden" name="loanId" value={loanId} />
      <button type="submit" className="text-xs text-slate-400 hover:text-rose-600" disabled={pending}>
        waive
      </button>
    </form>
  );
}
