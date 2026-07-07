"use client";

import { useActionState, useState } from "react";
import { renewCompliance } from "@/lib/actions/vehicles";

type Doc = "insurance" | "fitness" | "permit";

export function RenewForm({
  vehicleId,
  doc,
  label,
  currentExpiry,
  currentProvider,
  currentPolicy,
  currentPermitType,
}: {
  vehicleId: string;
  doc: Doc;
  label: string;
  currentExpiry: string | null;
  currentProvider?: string | null;
  currentPolicy?: string | null;
  currentPermitType?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(renewCompliance, {});

  if (!open) {
    return (
      <button className="text-xs font-medium text-brand-700 hover:underline" onClick={() => setOpen(true)}>
        {currentExpiry ? "Renew / edit" : "Set date"}
      </button>
    );
  }

  return (
    <form action={action} className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <input type="hidden" name="doc" value={doc} />
      <div className="text-xs font-semibold text-slate-500">Update {label}</div>
      {doc === "insurance" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <input name="insuranceProvider" className="input" placeholder="Provider" defaultValue={currentProvider ?? ""} />
          <input name="insurancePolicyNo" className="input" placeholder="Policy no." defaultValue={currentPolicy ?? ""} />
        </div>
      )}
      {doc === "permit" && (
        <input name="permitType" className="input" placeholder="Permit type" defaultValue={currentPermitType ?? ""} />
      )}
      <div>
        <label className="label">New expiry date</label>
        <input name="expiry" type="date" className="input" defaultValue={currentExpiry ?? ""} required />
      </div>
      {state?.error && <p className="text-xs text-rose-600">{state.error}</p>}
      {state?.ok && <p className="text-xs text-emerald-600">{state.ok}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary text-xs" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn-secondary text-xs" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
