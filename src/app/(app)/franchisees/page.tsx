import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guard";
import { computeLoanPosition } from "@/lib/domain/outstanding";
import { formatINR, toNumber } from "@/lib/money";
import { PageHeader, EmptyState, Money } from "@/components/ui";

export default async function FranchiseesPage() {
  await requireRole("ADMIN", "STAFF");

  const franchisees = await prisma.franchisee.findMany({
    orderBy: { code: "asc" },
    include: {
      loans: { include: { installments: true, charges: true } },
      ledger: true,
    },
  });

  return (
    <div>
      <PageHeader title="Franchisees (HLF)" subtitle={`${franchisees.length} partner(s)`} />
      {franchisees.length === 0 ? (
        <EmptyState>No franchisees yet.</EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Code</th>
                <th className="th">Name</th>
                <th className="th text-right">Loans</th>
                <th className="th text-right">Default share</th>
                <th className="th text-right">Franchisee deployed</th>
                <th className="th text-right">Head-office deployed</th>
                <th className="th text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {franchisees.map((f) => {
                // Net deployed = disbursements minus collections, per co-lender.
                let franchiseeNet = 0;
                let headOfficeNet = 0;
                for (const e of f.ledger) {
                  const sign = e.direction === "DISBURSEMENT" ? 1 : -1;
                  franchiseeNet += sign * toNumber(e.franchiseeAmount);
                  headOfficeNet += sign * toNumber(e.headOfficeAmount);
                }
                const outstanding = f.loans.reduce(
                  (s, l) => s + computeLoanPosition(l.installments, l.charges).totalReceivable,
                  0,
                );
                return (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="td font-mono text-xs">{f.code}</td>
                    <td className="td font-medium">{f.name}</td>
                    <td className="td text-right">{f.loans.length}</td>
                    <td className="td text-right">{toNumber(f.defaultFranchiseeSharePct)}%</td>
                    <td className="td text-right">{formatINR(Math.max(0, franchiseeNet))}</td>
                    <td className="td text-right">{formatINR(Math.max(0, headOfficeNet))}</td>
                    <td className="td text-right"><Money value={outstanding} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-400">
        “Deployed” is net capital still in the field (disbursements minus collections) for each
        co-lender, from the co-lending ledger.
      </p>
    </div>
  );
}
