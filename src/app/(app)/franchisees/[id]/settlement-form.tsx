"use client";

import { useActionState } from "react";
import { recordSettlement } from "@/lib/actions/settlements";
import { formatINR } from "@/lib/money";

export function SettlementForm({
  franchiseeId,
  netPayable,
}: {
  franchiseeId: string;
  netPayable: number;
}) {
  const [state, action, pending] = useActionState(recordSettlement, {});
  const disabled = netPayable <= 0.005;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="franchiseeId" value={franchiseeId} />
      <div className="text-sm text-slate-500">
        Net payable now:{" "}
        <span className="font-semibold text-slate-800">{formatINR(netPayable)}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="samount">
            Amount (₹)
          </label>
          <input
            id="samount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            disabled={disabled}
            defaultValue={netPayable > 0.005 ? netPayable.toFixed(2) : ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="smethod">
            Method
          </label>
          <select id="smethod" name="method" className="input" defaultValue="BANK_TRANSFER" disabled={disabled}>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="UPI">UPI</option>
            <option value="CASH">Cash</option>
            <option value="CHEQUE">Cheque</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ssettledOn">
            Date
          </label>
          <input
            id="ssettledOn"
            name="settledOn"
            type="date"
            className="input"
            disabled={disabled}
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div>
          <label className="label" htmlFor="snote">
            Note
          </label>
          <input id="snote" name="note" className="input" disabled={disabled} />
        </div>
      </div>
      {state?.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      )}
      {state?.ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.ok}</p>
      )}
      <button type="submit" className="btn-primary" disabled={pending || disabled}>
        {pending ? "Recording…" : "Record settlement"}
      </button>
      {disabled && <p className="text-xs text-slate-400">Nothing to settle right now.</p>}
    </form>
  );
}
