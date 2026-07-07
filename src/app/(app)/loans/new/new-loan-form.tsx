"use client";

import { useActionState, useMemo, useState } from "react";
import { createLoan } from "@/lib/actions/loans";
import { computeEmi } from "@/lib/domain/schedule";
import { formatINR } from "@/lib/money";

interface VehicleOpt {
  id: string;
  label: string;
}
interface CustomerOpt {
  id: string;
  name: string;
  code: string;
  vehicles: VehicleOpt[];
}
interface FranchiseeOpt {
  id: string;
  code: string;
  name: string;
  defaultSharePct: number;
}

export function NewLoanForm({
  customers,
  franchisees,
}: {
  customers: CustomerOpt[];
  franchisees: FranchiseeOpt[];
}) {
  const [state, action, pending] = useActionState(createLoan, {});
  const [customerId, setCustomerId] = useState("");
  const [base, setBase] = useState(300000);
  const [insurance, setInsurance] = useState(0);
  const [other, setOther] = useState(0);
  const [rate, setRate] = useState(14);
  const [method, setMethod] = useState<"FLAT" | "REDUCING">("FLAT");
  const [tenure, setTenure] = useState(24);
  const [share, setShare] = useState(80);

  const vehicles = customers.find((c) => c.id === customerId)?.vehicles ?? [];
  const principal = Number(base) + Number(insurance) + Number(other);
  const emi = useMemo(
    () =>
      computeEmi({
        principal,
        annualRatePct: Number(rate),
        tenureMonths: Number(tenure),
        method,
      }),
    [principal, rate, tenure, method],
  );

  const field = "input";

  return (
    <form action={action} className="space-y-6">
      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-500">Parties</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Customer</label>
            <select
              name="customerId"
              className={field}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
            >
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Vehicle (collateral)</label>
            <select name="vehicleId" className={field} required disabled={!customerId}>
              <option value="">{customerId ? "Select vehicle…" : "Pick a customer first"}</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            {customerId && vehicles.length === 0 && (
              <p className="mt-1 text-xs text-rose-600">
                This customer has no vehicles. Add one from their profile first.
              </p>
            )}
          </div>
          <div>
            <label className="label">Franchisee (HLF)</label>
            <select
              name="franchiseeId"
              className={field}
              required
              onChange={(e) => {
                const f = franchisees.find((x) => x.id === e.target.value);
                if (f) setShare(f.defaultSharePct);
              }}
            >
              <option value="">Select franchisee…</option>
              {franchisees.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-500">Amount financed</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Base loan (₹)" name="baseAmount" value={base} onChange={setBase} />
          <NumberField label="Insurance (₹)" name="insuranceAmount" value={insurance} onChange={setInsurance} />
          <NumberField label="Other add-ons (₹)" name="otherAddonAmount" value={other} onChange={setOther} />
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Total principal: <span className="font-semibold text-slate-800">{formatINR(principal)}</span>
        </p>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-500">Terms</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Interest rate (% p.a.)" name="interestRate" value={rate} onChange={setRate} step="0.01" />
          <div>
            <label className="label">Interest method</label>
            <select
              name="interestMethod"
              className={field}
              value={method}
              onChange={(e) => setMethod(e.target.value as "FLAT" | "REDUCING")}
            >
              <option value="FLAT">Flat</option>
              <option value="REDUCING">Reducing balance</option>
            </select>
          </div>
          <NumberField label="Tenure (months)" name="tenureMonths" value={tenure} onChange={setTenure} />
          <NumberField label="Processing fee (₹)" name="processingFee" value={0} />
          <div>
            <label className="label">Franchisee share (%)</label>
            <input
              name="franchiseeSharePct"
              type="number"
              step="0.01"
              min="0"
              max="100"
              className={field}
              value={share}
              onChange={(e) => setShare(Number(e.target.value))}
              required
            />
            <p className="mt-1 text-xs text-slate-400">Head office funds {(100 - share).toFixed(2)}%</p>
          </div>
          <NumberField label="Penalty rate (%/mo)" name="penaltyRatePctPerMonth" value={2} step="0.01" />
          <NumberField label="Zero-overdue discount (%)" name="zeroOverdueDiscountPct" value={2} step="0.01" />
          <div>
            <label className="label">First EMI date</label>
            <input name="firstEmiDate" type="date" className={field} required />
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-brand-50 p-4 text-sm text-brand-900">
          Estimated EMI: <span className="text-lg font-bold">{formatINR(emi)}</span>{" "}
          <span className="text-brand-700">× {tenure} months</span>
        </div>
      </section>

      <div>
        <label className="label">Notes</label>
        <input name="notes" className={field} placeholder="Optional" />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      )}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Creating…" : "Create loan & generate schedule"}
      </button>
    </form>
  );
}

function NumberField({
  label,
  name,
  value,
  onChange,
  step = "1",
}: {
  label: string;
  name: string;
  value: number;
  onChange?: (n: number) => void;
  step?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        name={name}
        type="number"
        step={step}
        min="0"
        className="input"
        value={value}
        onChange={onChange ? (e) => onChange(Number(e.target.value)) : undefined}
        required
      />
    </div>
  );
}
