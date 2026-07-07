import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guard";
import { computeLoanPosition } from "@/lib/domain/outstanding";
import { franchiseePosition } from "@/lib/domain/settlement";
import { formatINR, toNumber } from "@/lib/money";
import { PageHeader, EmptyState, Money } from "@/components/ui";

export default async function FranchiseesPage() {
  await requireRole("ADMIN", "STAFF");

  const franchisees = await prisma.franchisee.findMany({
    orderBy: { code: "asc" },
    include: {
      loans: { include: { installments: true, charges: true } },
      ledger: true,
      settlements: true,
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
                <th className="th text-right">Net payable</th>
                <th className="th text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {franchisees.map((f) => {
                const pos = franchiseePosition(f.ledger, f.settlements);
                const outstanding = f.loans.reduce(
                  (s, l) => s + computeLoanPosition(l.installments, l.charges).totalReceivable,
                  0,
                );
                return (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="td font-mono text-xs">{f.code}</td>
                    <td className="td font-medium">
                      <Link href={`/franchisees/${f.id}`} className="text-brand-700">
                        {f.name}
                      </Link>
                    </td>
                    <td className="td text-right">{f.loans.length}</td>
                    <td className="td text-right">{toNumber(f.defaultFranchiseeSharePct)}%</td>
                    <td className="td text-right">{formatINR(Math.max(0, pos.deployedCapital))}</td>
                    <td className={`td text-right ${pos.netPayable > 0.5 ? "font-medium text-amber-600" : ""}`}>
                      {formatINR(pos.netPayable)}
                    </td>
                    <td className="td text-right"><Money value={outstanding} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-400">
        “Deployed” is the franchisee’s net capital still in the field (disbursements minus
        collections). “Net payable” is their share of collections not yet settled to them.
      </p>
    </div>
  );
}
