import Link from "next/link";
import { startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser, loanScopeWhere, isStaff } from "@/lib/auth/guard";
import { computeLoanPosition } from "@/lib/domain/outstanding";
import { formatINR, toNumber } from "@/lib/money";
import { StatCard, PageHeader, Badge, Money } from "@/components/ui";

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role === "BORROWER") return <BorrowerHome name={user.name} customerId={user.customerId} />;
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

// ---------------------------------------------------------------------------
// Borrower home — a borrower sees only their own loans, dues and receipts.
// ---------------------------------------------------------------------------

async function BorrowerHome({ name, customerId }: { name: string; customerId: string | null }) {
  if (!customerId) {
    return (
      <div>
        <PageHeader title={`Welcome, ${name.split(" ")[0]}`} />
        <div className="card p-6 text-sm text-slate-500">
          Your account is not linked to a customer profile yet. Please contact the office.
        </div>
      </div>
    );
  }

  const loans = await prisma.loan.findMany({
    where: { customerId },
    include: {
      installments: true,
      charges: true,
      vehicle: true,
      payments: { orderBy: { paidAt: "desc" }, take: 6 },
    },
    orderBy: { createdAt: "desc" },
  });

  let totalOutstanding = 0;
  let totalOverdue = 0;
  for (const l of loans) {
    const pos = computeLoanPosition(l.installments, l.charges);
    totalOutstanding += pos.totalReceivable;
    totalOverdue += pos.overdueAmount;
  }

  const recentPayments = loans
    .flatMap((l) => l.payments.map((p) => ({ ...p, agreementNo: l.agreementNo })))
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
    .slice(0, 6);

  return (
    <div>
      <PageHeader title={`Welcome, ${name.split(" ")[0]}`} subtitle="Your loans at a glance" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active loans" value={String(loans.filter((l) => l.status === "ACTIVE").length)} />
        <StatCard label="Total outstanding" value={formatINR(totalOutstanding)} />
        <StatCard
          label="Overdue"
          value={formatINR(totalOverdue)}
          tone={totalOverdue > 0.5 ? "bad" : "good"}
        />
      </div>

      <div className="mt-6 space-y-4">
        {loans.map((l) => {
          const pos = computeLoanPosition(l.installments, l.charges);
          return (
            <div key={l.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/loans/${l.id}`} className="text-lg font-semibold text-brand-700">
                    {l.agreementNo}
                  </Link>
                  <div className="text-sm text-slate-500">{l.vehicle.registrationNo}</div>
                </div>
                <Badge value={l.status} />
              </div>
              <div className="mt-4 grid gap-4 text-sm sm:grid-cols-4">
                <Kv label="EMI" value={formatINR(l.emiAmount)} />
                <Kv
                  label="Next due"
                  value={
                    pos.nextDueDate
                      ? `${new Date(pos.nextDueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} · ${formatINR(pos.nextDueAmount)}`
                      : "—"
                  }
                />
                <Kv label="Outstanding" value={formatINR(pos.totalReceivable)} />
                <Kv
                  label="Overdue"
                  value={formatINR(pos.overdueAmount)}
                  tone={pos.overdueAmount > 0.5 ? "bad" : undefined}
                />
              </div>
              {pos.totalDiscountGiven > 0.5 && (
                <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  You&apos;ve earned {formatINR(pos.totalDiscountGiven)} in on-time discounts on this loan.
                </div>
              )}
            </div>
          );
        })}
        {loans.length === 0 && (
          <div className="card p-6 text-sm text-slate-500">You have no loans on record.</div>
        )}
      </div>

      {recentPayments.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-500">Recent payments</h2>
          <div className="card overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Receipt</th>
                  <th className="th">Agreement</th>
                  <th className="th">Date</th>
                  <th className="th text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="td font-medium">{p.receiptNo}</td>
                    <td className="td">{p.agreementNo}</td>
                    <td className="td">{new Date(p.paidAt).toLocaleDateString("en-IN")}</td>
                    <td className="td text-right"><Money value={p.amount} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Kv({ label, value, tone }: { label: string; value: string; tone?: "bad" }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`font-medium ${tone === "bad" ? "text-rose-600" : "text-slate-800"}`}>{value}</div>
    </div>
  );
}
