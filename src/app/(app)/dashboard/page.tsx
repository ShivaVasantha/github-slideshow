import Link from "next/link";
import { startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser, loanScopeWhere, isStaff } from "@/lib/auth/guard";
import { computeLoanPosition } from "@/lib/domain/outstanding";
import { formatINR, toNumber } from "@/lib/money";
import { StatCard, PageHeader, Badge, Money } from "@/components/ui";

export default async function DashboardPage() {
  const user = await requireUser();
  const scope = loanScopeWhere(user);

  const loans = await prisma.loan.findMany({
    where: scope,
    include: { installments: true, charges: true, customer: true, vehicle: true },
  });

  let disbursed = 0;
  let outstanding = 0;
  let overdue = 0;
  let overdueLoans = 0;
  let activeCount = 0;
  const overdueList: {
    id: string;
    agreementNo: string;
    customer: string;
    overdueAmount: number;
    daysPastDue: number;
  }[] = [];

  for (const loan of loans) {
    disbursed += toNumber(loan.principal);
    const pos = computeLoanPosition(loan.installments, loan.charges);
    outstanding += pos.totalReceivable;
    overdue += pos.overdueAmount;
    if (loan.status === "ACTIVE") activeCount += 1;
    if (pos.overdueAmount > 0.5) {
      overdueLoans += 1;
      overdueList.push({
        id: loan.id,
        agreementNo: loan.agreementNo,
        customer: loan.customer.name,
        overdueAmount: pos.overdueAmount,
        daysPastDue: pos.daysPastDue,
      });
    }
  }
  overdueList.sort((a, b) => b.overdueAmount - a.overdueAmount);

  // Collections this month (scoped).
  const monthStart = startOfMonth(new Date());
  const payments = await prisma.payment.findMany({
    where: { paidAt: { gte: monthStart }, loan: scope },
    select: { amount: true },
  });
  const collectedThisMonth = payments.reduce((s, p) => s + toNumber(p.amount), 0);

  // Upcoming compliance expiries (staff only).
  const soon = new Date();
  soon.setDate(soon.getDate() + 45);
  const expiringVehicles = isStaff(user)
    ? await prisma.vehicle.findMany({
        where: {
          OR: [
            { insuranceExpiry: { lte: soon } },
            { fitnessExpiry: { lte: soon } },
            { permitExpiry: { lte: soon } },
          ],
        },
        include: { customer: true },
        take: 8,
      })
    : [];

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle="Portfolio overview"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active loans" value={String(activeCount)} hint={`${loans.length} total`} />
        <StatCard label="Total disbursed" value={formatINR(disbursed)} />
        <StatCard label="Outstanding" value={formatINR(outstanding)} />
        <StatCard
          label="Overdue"
          value={formatINR(overdue)}
          hint={`${overdueLoans} loan(s)`}
          tone={overdue > 0 ? "bad" : "good"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="text-sm font-medium text-slate-500">Collected this month</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">
            {formatINR(collectedThisMonth)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {payments.length} payment(s) since {monthStart.toLocaleDateString("en-IN")}
          </div>
        </div>

        {isStaff(user) && (
          <div className="card p-5">
            <div className="mb-3 text-sm font-medium text-slate-500">
              Compliance expiring within 45 days
            </div>
            {expiringVehicles.length === 0 ? (
              <p className="text-sm text-slate-400">Nothing expiring soon.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {expiringVehicles.map((v) => (
                  <li key={v.id} className="flex justify-between">
                    <span className="font-medium">{v.registrationNo}</span>
                    <span className="text-slate-500">{v.customer.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Overdue accounts</h2>
        {overdueList.length === 0 ? (
          <div className="card p-6 text-sm text-slate-500">No overdue accounts. 🎉</div>
        ) : (
          <div className="card overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Agreement</th>
                  <th className="th">Customer</th>
                  <th className="th">Days past due</th>
                  <th className="th text-right">Overdue amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueList.slice(0, 10).map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="td">
                      <Link href={`/loans/${o.id}`} className="font-medium text-brand-700">
                        {o.agreementNo}
                      </Link>
                    </td>
                    <td className="td">{o.customer}</td>
                    <td className="td">
                      <Badge value={o.daysPastDue > 30 ? "OVERDUE" : "PARTIAL"} />
                      <span className="ml-2 text-slate-500">{o.daysPastDue}d</span>
                    </td>
                    <td className="td text-right font-medium text-rose-600">
                      <Money value={o.overdueAmount} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
