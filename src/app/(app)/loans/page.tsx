import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, loanScopeWhere, isStaff } from "@/lib/auth/guard";
import { computeLoanPosition } from "@/lib/domain/outstanding";
import { PageHeader, Badge, Money, EmptyState, LinkButton } from "@/components/ui";

export default async function LoansPage() {
  const user = await requireUser();
  const scope = loanScopeWhere(user);

  const loans = await prisma.loan.findMany({
    where: scope,
    include: {
      installments: true,
      charges: true,
      customer: true,
      vehicle: true,
      franchisee: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Loans"
        subtitle={`${loans.length} agreement(s)`}
        action={isStaff(user) ? <LinkButton href="/loans/new">+ New loan</LinkButton> : undefined}
      />

      {loans.length === 0 ? (
        <EmptyState>No loans yet.</EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Agreement</th>
                <th className="th">Customer</th>
                <th className="th">Vehicle</th>
                <th className="th">Franchisee</th>
                <th className="th">Status</th>
                <th className="th text-right">EMI</th>
                <th className="th text-right">Outstanding</th>
                <th className="th text-right">Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loans.map((loan) => {
                const pos = computeLoanPosition(loan.installments, loan.charges);
                return (
                  <tr key={loan.id} className="hover:bg-slate-50">
                    <td className="td">
                      <Link href={`/loans/${loan.id}`} className="font-medium text-brand-700">
                        {loan.agreementNo}
                      </Link>
                    </td>
                    <td className="td">{loan.customer.name}</td>
                    <td className="td">{loan.vehicle.registrationNo}</td>
                    <td className="td">{loan.franchisee.code}</td>
                    <td className="td">
                      <Badge value={loan.status} />
                    </td>
                    <td className="td text-right">
                      <Money value={loan.emiAmount} />
                    </td>
                    <td className="td text-right">
                      <Money value={pos.totalReceivable} />
                    </td>
                    <td className="td text-right">
                      {pos.overdueAmount > 0.5 ? (
                        <span className="font-medium text-rose-600">
                          <Money value={pos.overdueAmount} />
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
