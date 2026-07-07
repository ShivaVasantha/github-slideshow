import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guard";
import { toNumber } from "@/lib/money";
import { PageHeader } from "@/components/ui";
import { NewLoanForm } from "./new-loan-form";

export default async function NewLoanPage() {
  await requireRole("ADMIN", "STAFF");

  const [customers, franchisees] = await Promise.all([
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      include: { vehicles: true },
    }),
    prisma.franchisee.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="New loan" subtitle="Create an agreement and generate the EMI schedule" />
      <NewLoanForm
        customers={customers.map((c) => ({
          id: c.id,
          name: c.name,
          code: c.code,
          vehicles: c.vehicles.map((v) => ({
            id: v.id,
            label: `${v.registrationNo} · ${v.type.replaceAll("_", " ")}`,
          })),
        }))}
        franchisees={franchisees.map((f) => ({
          id: f.id,
          code: f.code,
          name: f.name,
          defaultSharePct: toNumber(f.defaultFranchiseeSharePct),
        }))}
      />
    </div>
  );
}
