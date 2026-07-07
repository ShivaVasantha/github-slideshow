"use client";

import { useActionState } from "react";
import { createCustomer } from "@/lib/actions/customers";

export function CustomerForm() {
  const [state, action, pending] = useActionState(createCustomer, {});
  return (
    <form action={action} className="space-y-6">
      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-500">Borrower details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" name="name" required />
          <Field label="Phone" name="phone" />
          <Field label="Alternate phone" name="altPhone" />
          <Field label="Email" name="email" type="email" />
          <Field label="City" name="city" />
          <Field label="Pincode" name="pincode" />
        </div>
        <div className="mt-4">
          <label className="label">Address</label>
          <textarea name="address" className="input" rows={2} />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-500">KYC</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Aadhaar no." name="aadhaarNo" />
          <Field label="PAN no." name="panNo" />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-500">Guarantor</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Guarantor name" name="guarantorName" />
          <Field label="Guarantor phone" name="guarantorPhone" />
        </div>
        <div className="mt-4">
          <label className="label">Guarantor address</label>
          <textarea name="guarantorAddress" className="input" rows={2} />
        </div>
      </section>

      {state?.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      )}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Create customer"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input name={name} type={type} className="input" required={required} />
    </div>
  );
}
