import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, loanScopeWhere, isStaff } from "@/lib/auth/guard";
import { computeLoanPosition, computePenalty } from "@/lib/domain/outstanding";
import { formatINR, toNumber } from "@/lib/money";
import { PageHeader, Badge, Money, StatCard } from "@/components/ui";
import { PaymentForm } from "./payment-form";
import { AddChargeForm, ApplyPenaltyButton, WaiveChargeButton } from "./charge-forms";

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const loan = await prisma.loan.findFirst({
    where: { id, ...loanScopeWhere(user) },
    include: {
      customer: true,
      vehicle: true,
      franchisee: true,
      addons: true,
      installments: { orderBy: { seqNo: "asc" } },
      charges: { orderBy: { incurredOn: "asc" } },
      payments: {
        orderBy: { paidAt: "desc" },
        include: { receivedBy: true },
      },
    },
  });
  if (!loan) notFound();

  const pos = computeLoanPosition(loan.installments, loan.charges);
  const penalty = computePenalty(loan, pos.overdueAmount, pos.daysPastDue);
  const staff = isStaff(user);

  return (
    <div>
      <PageHeader
        title={loan.agreementNo}
        subtitle={`${loan.customer.name} · ${loan.vehicle.registrationNo}`}
        action={<Badge value={loan.status} />}
      />

      {/* Position summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Financed" value={formatINR(loan.principal)} hint={`EMI ${formatINR(loan.emiAmount)}`} />
        <StatCard label="Outstanding" value={formatINR(pos.totalReceivable)} />
        <StatCard
          label="Overdue"
          value={formatINR(pos.overdueAmount)}
          hint={pos.daysPastDue > 0 ? `${pos.daysPastDue} days past due` : "current"}
          tone={pos.overdueAmount > 0.5 ? "bad" : "good"}
        />
        <StatCard
          label="Discount earned"
          value={formatINR(pos.totalDiscountGiven)}
          tone="good"
        />
      </div>

      {/* Terms */}
      <div className="mt-4 card p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Agreement terms</h2>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
          <Term label="Interest" value={`${toNumber(loan.interestRate)}% ${loan.interestMethod}`} />
          <Term label="Tenure" value={`${loan.tenureMonths} months`} />
          <Term label="First EMI" value={fmtDate(loan.firstEmiDate)} />
          <Term label="Agreement date" value={fmtDate(loan.agreementDate)} />
          <Term label="Co-lending" value={`HLF ${toNumber(loan.franchiseeSharePct)}% · HO ${toNumber(loan.headOfficeSharePct)}%`} />
          <Term label="Franchisee" value={`${loan.franchisee.name} (${loan.franchisee.code})`} />
          <Term label="Penalty rate" value={`${toNumber(loan.penaltyRatePctPerMonth)}%/mo`} />
          <Term label="Zero-overdue discount" value={`${toNumber(loan.zeroOverdueDiscountPct)}%`} />
        </dl>
        {loan.addons.length > 0 && (
          <div className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500">
            Financed add-ons:{" "}
            {loan.addons.map((a) => `${a.type} ${formatINR(a.amount)}`).join(", ")}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Schedule + payments */}
        <div className="space-y-6 lg:col-span-2">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Repayment schedule</h2>
            <div className="card overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">#</th>
                    <th className="th">Due date</th>
                    <th className="th text-right">Principal</th>
                    <th className="th text-right">Interest</th>
                    <th className="th text-right">EMI</th>
                    <th className="th text-right">Paid</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loan.installments.map((i) => {
                    const paid = toNumber(i.principalPaid) + toNumber(i.interestPaid);
                    return (
                      <tr key={i.id}>
                        <td className="td">{i.seqNo}</td>
                        <td className="td">{fmtDate(i.dueDate)}</td>
                        <td className="td text-right"><Money value={i.principalDue} /></td>
                        <td className="td text-right"><Money value={i.interestDue} /></td>
                        <td className="td text-right"><Money value={i.totalDue} /></td>
                        <td className="td text-right text-slate-500">{formatINR(paid)}</td>
                        <td className="td"><Badge value={i.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Payments</h2>
            {loan.payments.length === 0 ? (
              <div className="card p-5 text-sm text-slate-500">No payments recorded yet.</div>
            ) : (
              <div className="card overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="th">Receipt</th>
                      <th className="th">Date</th>
                      <th className="th">Mode</th>
                      <th className="th text-right">Amount</th>
                      <th className="th">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loan.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="td font-medium">{p.receiptNo}</td>
                        <td className="td">{fmtDate(p.paidAt)}</td>
                        <td className="td">{p.mode.replaceAll("_", " ")}</td>
                        <td className="td text-right"><Money value={p.amount} /></td>
                        <td className="td text-slate-500">{p.receivedBy?.name ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Charges */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Charges</h2>
              {staff && pos.overdueAmount > 0.5 && (
                <span className="text-xs text-slate-500">
                  Suggested penalty: {formatINR(penalty)} · <ApplyPenaltyButton loanId={loan.id} />
                </span>
              )}
            </div>
            {loan.charges.length === 0 ? (
              <div className="card p-5 text-sm text-slate-500">No charges.</div>
            ) : (
              <div className="card overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="th">Type</th>
                      <th className="th">Description</th>
                      <th className="th">Date</th>
                      <th className="th text-right">Amount</th>
                      <th className="th text-right">Paid</th>
                      <th className="th"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loan.charges.map((c) => {
                      const outstanding = toNumber(c.amount) - toNumber(c.amountPaid);
                      return (
                        <tr key={c.id} className={c.waived ? "opacity-50" : ""}>
                          <td className="td">{c.type.replaceAll("_", " ")}</td>
                          <td className="td text-slate-500">{c.description ?? "—"}</td>
                          <td className="td">{fmtDate(c.incurredOn)}</td>
                          <td className="td text-right"><Money value={c.amount} /></td>
                          <td className="td text-right text-slate-500">
                            {c.waived ? "waived" : formatINR(toNumber(c.amountPaid))}
                          </td>
                          <td className="td text-right">
                            {staff && !c.waived && outstanding > 0.005 && (
                              <WaiveChargeButton chargeId={c.id} loanId={loan.id} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Actions column (staff only) */}
        {staff && loan.status !== "CLOSED" && (
          <div className="space-y-6">
            <section className="card p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Record payment</h2>
              <PaymentForm
                loanId={loan.id}
                suggestedAmount={pos.overdueAmount > 0.5 ? pos.overdueAmount : pos.nextDueAmount}
              />
            </section>
            <section className="card p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Add charge</h2>
              <AddChargeForm loanId={loan.id} />
            </section>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Link href="/loans" className="text-sm text-brand-700 hover:underline">
          ← Back to loans
        </Link>
      </div>
    </div>
  );
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-700">{value}</dd>
    </div>
  );
}
