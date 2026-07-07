import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guard";
import { computeLoanPosition } from "@/lib/domain/outstanding";
import { franchiseePosition } from "@/lib/domain/settlement";
import { formatINR, toNumber } from "@/lib/money";
import { PageHeader, StatCard, Badge, Money } from "@/components/ui";
import { SettlementForm } from "./settlement-form";

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function FranchiseeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  // Access control: staff/admin see any; a franchisee sees only their own.
  if (user.role === "FRANCHISEE" && user.franchiseeId !== id) redirect("/dashboard");
  if (user.role === "BORROWER") redirect("/dashboard");

  const franchisee = await prisma.franchisee.findUnique({
    where: { id },
    include: {
      loans: {
        include: { installments: true, charges: true, customer: true, vehicle: true },
        orderBy: { createdAt: "desc" },
      },
      ledger: { orderBy: { occurredOn: "desc" }, include: { loan: true } },
      settlements: { orderBy: { settledOn: "desc" } },
    },
  });
  if (!franchisee) notFound();

  const staff = user.role === "ADMIN" || user.role === "STAFF";

  // Co-lending position from the ledger + pay-outs.
  const pos = franchiseePosition(franchisee.ledger, franchisee.settlements);
  const outstanding = franchisee.loans.reduce(
    (s, l) => s + computeLoanPosition(l.installments, l.charges).totalReceivable,
    0,
  );

  return (
    <div>
      <PageHeader
        title={franchisee.name}
        subtitle={`${franchisee.code}${franchisee.contactPerson ? " · " + franchisee.contactPerson : ""}${franchisee.phone ? " · " + franchisee.phone : ""}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Loans" value={String(franchisee.loans.length)} hint={`Default share ${toNumber(franchisee.defaultFranchiseeSharePct)}%`} />
        <StatCard label="Capital deployed (theirs)" value={formatINR(Math.max(0, pos.deployedCapital))} hint="disbursed − collected" />
        <StatCard label="Collected for them" value={formatINR(pos.collectedForThem)} tone="good" hint="their share of collections" />
        <StatCard
          label="Net payable now"
          value={formatINR(pos.netPayable)}
          tone={pos.netPayable > 0.5 ? "warn" : "good"}
          hint={`${formatINR(pos.settledToDate)} settled to date`}
        />
      </div>

      {/* Settlement summary */}
      <div className="mt-4 card p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Co-lending settlement position</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-4"></th>
                <th className="py-2 pr-4 text-right">Franchisee (HLF)</th>
                <th className="py-2 pr-4 text-right">Head office</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <SettleRow label="Disbursed (capital funded)" a={pos.disbursedByThem} b={pos.headOfficeDisbursed} />
              <SettleRow label="Collected (recovered)" a={pos.collectedForThem} b={pos.headOfficeCollected} />
              <SettleRow label="Net capital in field" a={pos.deployedCapital} b={pos.headOfficeDisbursed - pos.headOfficeCollected} bold />
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
          <span className="text-slate-500">Their collections settled to date</span>
          <span className="font-medium text-slate-700">{formatINR(pos.settledToDate)}</span>
        </div>
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <span className="font-semibold text-slate-700">Net payable to franchisee now</span>
          <span className="font-semibold text-amber-600">{formatINR(pos.netPayable)}</span>
        </div>
      </div>

      {/* Record a pay-out (staff only) */}
      {staff && (
        <div className="mt-4 card p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-500">Settle to franchisee</h2>
          <SettlementForm franchiseeId={franchisee.id} netPayable={pos.netPayable} />
        </div>
      )}

      {/* Settlement history */}
      {franchisee.settlements.length > 0 && (
        <div className="mt-4 card overflow-x-auto">
          <div className="px-5 pt-4 text-sm font-semibold text-slate-500">Settlement history</div>
          <table className="mt-2 min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Reference</th>
                <th className="th">Date</th>
                <th className="th">Method</th>
                <th className="th text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {franchisee.settlements.map((s) => (
                <tr key={s.id}>
                  <td className="td font-medium">{s.reference}</td>
                  <td className="td">{fmtDate(s.settledOn)}</td>
                  <td className="td">{s.method.replaceAll("_", " ")}</td>
                  <td className="td text-right"><Money value={s.amount} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Portfolio */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-500">Portfolio</h2>
          {franchisee.loans.length === 0 ? (
            <p className="text-sm text-slate-400">No loans.</p>
          ) : (
            <div className="card overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Agreement</th>
                    <th className="th">Customer</th>
                    <th className="th">Status</th>
                    <th className="th text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {franchisee.loans.map((l) => {
                    const pos = computeLoanPosition(l.installments, l.charges);
                    return (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="td">
                          <Link href={`/loans/${l.id}`} className="font-medium text-brand-700">
                            {l.agreementNo}
                          </Link>
                        </td>
                        <td className="td">{l.customer.name}</td>
                        <td className="td"><Badge value={l.status} /></td>
                        <td className="td text-right"><Money value={pos.totalReceivable} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Statement */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-500">Co-lending statement</h2>
          {franchisee.ledger.length === 0 ? (
            <p className="text-sm text-slate-400">No ledger entries.</p>
          ) : (
            <div className="card overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Date</th>
                    <th className="th">Entry</th>
                    <th className="th text-right">Their share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {franchisee.ledger.slice(0, 30).map((e) => {
                    const disb = e.direction === "DISBURSEMENT";
                    return (
                      <tr key={e.id}>
                        <td className="td whitespace-nowrap">{fmtDate(e.occurredOn)}</td>
                        <td className="td">
                          <span className={disb ? "text-rose-600" : "text-emerald-600"}>
                            {disb ? "Disbursement" : "Collection"}
                          </span>
                          <span className="ml-2 text-xs text-slate-400">{e.loan.agreementNo}</span>
                        </td>
                        <td className={`td text-right ${disb ? "text-rose-600" : "text-emerald-600"}`}>
                          {disb ? "−" : "+"}
                          {formatINR(toNumber(e.franchiseeAmount))}
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

      {(user.role === "ADMIN" || user.role === "STAFF") && (
        <div className="mt-6">
          <Link href="/franchisees" className="text-sm text-brand-700 hover:underline">
            ← Back to franchisees
          </Link>
        </div>
      )}
    </div>
  );
}

function SettleRow({ label, a, b, bold }: { label: string; a: number; b: number; bold?: boolean }) {
  return (
    <tr className={bold ? "font-semibold text-slate-800" : "text-slate-600"}>
      <td className="py-2 pr-4">{label}</td>
      <td className="py-2 pr-4 text-right">{formatINR(a)}</td>
      <td className="py-2 pr-4 text-right">{formatINR(b)}</td>
    </tr>
  );
}
