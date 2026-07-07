import Link from "next/link";
import { startOfMonth } from "date-fns";
import { requireRole } from "@/lib/auth/guard";
import { formatINR } from "@/lib/money";
import { PageHeader, StatCard, Money } from "@/components/ui";
import {
  getAgeingReport,
  getCollectionsReport,
  getPortfolioReport,
  type AgeingBucket,
} from "@/lib/reports";

function parseDate(v: string | undefined, fallback: Date): Date {
  if (!v) return fallback;
  const d = new Date(v);
  return isNaN(d.getTime()) ? fallback : d;
}
function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const BUCKETS: AgeingBucket[] = ["Current", "1-30", "31-60", "61-90", "90+"];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireRole("ADMIN", "STAFF");
  const sp = await searchParams;

  const from = parseDate(sp.from, startOfMonth(new Date()));
  const to = parseDate(sp.to, new Date());

  const [ageing, collections, portfolio] = await Promise.all([
    getAgeingReport(),
    getCollectionsReport(from, to),
    getPortfolioReport(),
  ]);

  const collectionsQuery = `from=${iso(from)}&to=${iso(to)}`;

  return (
    <div className="space-y-8">
      <PageHeader title="Reports" subtitle="Portfolio, collections and overdue ageing" />

      {/* Portfolio summary */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Portfolio</h2>
          <Link href="/reports/export?type=portfolio" className="btn-secondary text-sm" prefetch={false}>
            ⭳ Export CSV
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Active loans" value={String(portfolio.activeLoans)} />
          <StatCard label="Total disbursed" value={formatINR(portfolio.totalDisbursed)} />
          <StatCard label="Total outstanding" value={formatINR(portfolio.totalOutstanding)} />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="card overflow-x-auto">
            <div className="px-4 pt-3 text-sm font-semibold text-slate-500">By franchisee</div>
            <table className="mt-2 min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Franchisee</th>
                  <th className="th text-right">Loans</th>
                  <th className="th text-right">Disbursed</th>
                  <th className="th text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {portfolio.byFranchisee.map((f) => (
                  <tr key={f.code}>
                    <td className="td">{f.code} · {f.name}</td>
                    <td className="td text-right">{f.loans}</td>
                    <td className="td text-right"><Money value={f.disbursed} /></td>
                    <td className="td text-right"><Money value={f.outstanding} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card overflow-x-auto">
            <div className="px-4 pt-3 text-sm font-semibold text-slate-500">By vehicle type</div>
            <table className="mt-2 min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Type</th>
                  <th className="th text-right">Loans</th>
                  <th className="th text-right">Disbursed</th>
                  <th className="th text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {portfolio.byType.map((t) => (
                  <tr key={t.type}>
                    <td className="td">{t.type.replaceAll("_", " ")}</td>
                    <td className="td text-right">{t.loans}</td>
                    <td className="td text-right"><Money value={t.disbursed} /></td>
                    <td className="td text-right"><Money value={t.outstanding} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Ageing */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Overdue ageing</h2>
          <Link href="/reports/export?type=ageing" className="btn-secondary text-sm" prefetch={false}>
            ⭳ Export CSV
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {BUCKETS.map((b) => (
            <div key={b} className="card p-4">
              <div className="text-xs font-medium text-slate-500">
                {b === "Current" ? "Current (no overdue)" : `${b} days`}
              </div>
              <div className={`mt-1 text-lg font-semibold ${b === "Current" ? "text-slate-800" : "text-rose-600"}`}>
                {formatINR(ageing.bucketTotals[b])}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Agreement</th>
                <th className="th">Customer</th>
                <th className="th">HLF</th>
                <th className="th text-right">Outstanding</th>
                <th className="th text-right">Overdue</th>
                <th className="th text-right">Days</th>
                <th className="th">Bucket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ageing.rows.map((r) => (
                <tr key={r.loanId} className="hover:bg-slate-50">
                  <td className="td">
                    <Link href={`/loans/${r.loanId}`} className="font-medium text-brand-700">
                      {r.agreementNo}
                    </Link>
                  </td>
                  <td className="td">{r.customer}</td>
                  <td className="td">{r.franchisee}</td>
                  <td className="td text-right"><Money value={r.outstanding} /></td>
                  <td className={`td text-right ${r.overdue > 0.5 ? "text-rose-600" : "text-slate-400"}`}>
                    {r.overdue > 0.5 ? formatINR(r.overdue) : "—"}
                  </td>
                  <td className="td text-right">{r.daysPastDue || "—"}</td>
                  <td className="td">{r.bucket}</td>
                </tr>
              ))}
              {ageing.rows.length === 0 && (
                <tr><td className="td text-slate-400" colSpan={7}>No active loans.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Collections */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Collections</h2>
          <div className="flex items-center gap-2">
            <form method="get" className="flex items-center gap-2">
              <input type="date" name="from" defaultValue={iso(from)} className="input py-1 text-sm" />
              <span className="text-slate-400">to</span>
              <input type="date" name="to" defaultValue={iso(to)} className="input py-1 text-sm" />
              <button type="submit" className="btn-secondary text-sm">Apply</button>
            </form>
            <Link href={`/reports/export?type=collections&${collectionsQuery}`} className="btn-secondary text-sm" prefetch={false}>
              ⭳ Export CSV
            </Link>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total collected" value={formatINR(collections.total)} tone="good" />
          <StatCard label="Payments" value={String(collections.count)} />
          <StatCard label="Period" value={`${fmtDate(from)} – ${fmtDate(to)}`} />
        </div>
        <div className="mt-4 card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Receipt</th>
                <th className="th">Date</th>
                <th className="th">Agreement</th>
                <th className="th">Customer</th>
                <th className="th">Mode</th>
                <th className="th text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {collections.rows.map((r) => (
                <tr key={r.receiptNo}>
                  <td className="td font-medium">{r.receiptNo}</td>
                  <td className="td">{fmtDate(r.paidAt)}</td>
                  <td className="td">{r.agreementNo}</td>
                  <td className="td">{r.customer}</td>
                  <td className="td">{r.mode.replaceAll("_", " ")}</td>
                  <td className="td text-right"><Money value={r.amount} /></td>
                </tr>
              ))}
              {collections.rows.length === 0 && (
                <tr><td className="td text-slate-400" colSpan={6}>No payments in this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
