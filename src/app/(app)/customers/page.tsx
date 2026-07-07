import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guard";
import { PageHeader, EmptyState, LinkButton } from "@/components/ui";

export default async function CustomersPage() {
  await requireRole("ADMIN", "STAFF");

  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { loans: true, vehicles: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} borrower(s)`}
        action={<LinkButton href="/customers/new">+ New customer</LinkButton>}
      />
      {customers.length === 0 ? (
        <EmptyState>No customers yet.</EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Code</th>
                <th className="th">Name</th>
                <th className="th">Phone</th>
                <th className="th">City</th>
                <th className="th text-right">Vehicles</th>
                <th className="th text-right">Loans</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="td font-mono text-xs">{c.code}</td>
                  <td className="td">
                    <Link href={`/customers/${c.id}`} className="font-medium text-brand-700">
                      {c.name}
                    </Link>
                  </td>
                  <td className="td">{c.phone ?? "—"}</td>
                  <td className="td">{c.city ?? "—"}</td>
                  <td className="td text-right">{c._count.vehicles}</td>
                  <td className="td text-right">{c._count.loans}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
