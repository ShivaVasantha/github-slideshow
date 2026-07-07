import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guard";
import { computeLoanPosition } from "@/lib/domain/outstanding";
import { formatINR, toNumber } from "@/lib/money";
import { PageHeader, StatCard, Badge, Money } from "@/components/ui";

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
    },
  });
  if (!franchisee) notFound();

  // Co-lending position from the ledger.
  let franchiseeDisbursed = 0;
  let franchiseeCollected = 0;
  let headOfficeDisbursed = 0;
  let headOfficeCollected = 0;
  for (const e of franchisee.ledger) {
    if (e.direction === "DISBURSEMENT") {
      franchiseeDisbursed += toNumber(e.franchiseeAmount);
      headOfficeDisbursed += toNumber(e.headOfficeAmount);
    } else {
      franchiseeCollected += toNumber(e.franchiseeAmount);
      headOfficeCollected += toNumber(e.headOfficeAmount);
    }
  }
  const franchiseeDeployed = franchiseeDisbursed - franchiseeCollected; // capital still in field
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
        <StatCard label="Capital deployed (theirs)" value={formatINR(Math.max(0, franchiseeDeployed))} hint="disbursed − collected" />
        <StatCard label="Collected for them" value={formatINR(franchiseeCollected)} tone="good" hint="their share of collections" />
        <StatCard label="Portfolio outstanding" value={formatINR(outstanding)} />
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
              <SettleRow label="Disbursed (capital funded)" a={franchiseeDisbursed} b={headOfficeDisbursed} />
              <SettleRow label="Collected (recovered)" a={franchiseeCollected} b={headOfficeCollected} />
              <SettleRow label="Net capital in field" a={franchiseeDeployed} b={headOfficeDisbursed - headOfficeCollected} bold />
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Collections shown are each co-lender&apos;s share of borrower repayments, split by each
          loan&apos;s agreed ratio. Settlement pays the franchisee their collected share less any
          agreed fees.
        </p>
      </div>

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
