"use client";

import { useActionState, useState } from "react";
import { createVehicle } from "@/lib/actions/vehicles";

export function AddVehicleForm({ customerId }: { customerId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createVehicle, {});

  if (!open) {
    return (
      <button className="btn-secondary text-sm" onClick={() => setOpen(true)}>
        + Add vehicle
      </button>
    );
  }

  return (
    <form action={action} className="card mt-3 space-y-4 p-5">
      <input type="hidden" name="customerId" value={customerId} />
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Registration no.</label>
          <input name="registrationNo" className="input" required placeholder="TN70 AB 1234" />
        </div>
        <div>
          <label className="label">Type</label>
          <select name="type" className="input" defaultValue="TAXI">
            <option value="TAXI">Taxi</option>
            <option value="TRANSPORT">Transport</option>
            <option value="PERSONAL">Personal</option>
            <option value="GOODS_CARRIER">Goods carrier</option>
            <option value="TRACTOR">Tractor</option>
            <option value="EARTHMOVER">Earthmover</option>
            <option value="BULLDOZER">Bulldozer</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className="label">Make / Model</label>
          <div className="flex gap-2">
            <input name="make" className="input" placeholder="Make" />
            <input name="model" className="input" placeholder="Model" />
          </div>
        </div>
        <div>
          <label className="label">Manufacture year</label>
          <input name="manufactureYear" type="number" className="input" />
        </div>
        <div>
          <label className="label">Engine no.</label>
          <input name="engineNo" className="input" />
        </div>
        <div>
          <label className="label">Chassis no.</label>
          <input name="chassisNo" className="input" />
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <p className="mb-3 text-sm font-medium text-slate-500">Compliance (optional)</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Insurance provider</label>
            <input name="insuranceProvider" className="input" />
          </div>
          <div>
            <label className="label">Insurance policy no.</label>
            <input name="insurancePolicyNo" className="input" />
          </div>
          <div>
            <label className="label">Insurance expiry</label>
            <input name="insuranceExpiry" type="date" className="input" />
          </div>
          <div>
            <label className="label">Fitness expiry</label>
            <input name="fitnessExpiry" type="date" className="input" />
          </div>
          <div>
            <label className="label">Permit type</label>
            <input name="permitType" className="input" />
          </div>
          <div>
            <label className="label">Permit expiry</label>
            <input name="permitExpiry" type="date" className="input" />
          </div>
        </div>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      )}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save vehicle"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
