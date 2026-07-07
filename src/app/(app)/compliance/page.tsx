import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guard";
import { complianceStatus, complianceTone, type ComplianceLevel } from "@/lib/domain/compliance";
import { PageHeader, StatCard, EmptyState } from "@/components/ui";

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

interface Item {
  vehicleId: string;
  registrationNo: string;
  type: string;
  customerId: string;
  customerName: string;
  doc: string;
  expiry: Date | null;
  level: ComplianceLevel;
  days: number | null;
  label: string;
}

export default async function CompliancePage() {
  await requireRole("ADMIN", "STAFF");

  const vehicles = await prisma.vehicle.findMany({ include: { customer: true } });

  const items: Item[] = [];
  for (const v of vehicles) {
    const docs = [
      { doc: "Insurance", expiry: v.insuranceExpiry },
      { doc: "Fitness", expiry: v.fitnessExpiry },
      { doc: "Permit", expiry: v.permitExpiry },
    ];
    for (const d of docs) {
      const st = complianceStatus(d.expiry);
      if (st.level === "expired" || st.level === "soon") {
        items.push({
          vehicleId: v.id,
          registrationNo: v.registrationNo,
          type: v.type.replaceAll("_", " "),
          customerId: v.customerId,
          customerName: v.customer.name,
          doc: d.doc,
          expiry: d.expiry,
          level: st.level,
          days: st.days,
          label: st.label,
        });
      }
    }
  }

  // Most urgent first (expired before soon; within each, soonest expiry first).
  items.sort((a, b) => (a.days ?? 0) - (b.days ?? 0));

  const expired = items.filter((i) => i.level === "expired");
  const soon = items.filter((i) => i.level === "soon");

  return (
    <div>
      <PageHeader
        title="Compliance"
        subtitle="Insurance, fitness certificate and permit expiries across the fleet"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Expired" value={String(expired.length)} tone={expired.length ? "bad" : "good"} />
        <StatCard label="Expiring within 45 days" value={String(soon.length)} tone={soon.length ? "warn" : "good"} />
        <StatCard label="Vehicles tracked" value={String(vehicles.length)} />
      </div>

      <div className="mt-6">
        {items.length === 0 ? (
          <EmptyState>All documents are valid for more than 45 days. 🎉</EmptyState>
        ) : (
          <div className="card overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Vehicle</th>
                  <th className="th">Owner</th>
                  <th className="th">Document</th>
                  <th className="th">Expiry</th>
                  <th className="th">Status</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((i, idx) => (
                  <tr key={`${i.vehicleId}-${i.doc}-${idx}`} className="hover:bg-slate-50">
                    <td className="td">
                      <Link href={`/vehicles/${i.vehicleId}`} className="font-medium text-brand-700">
                        {i.registrationNo}
                      </Link>
                      <span className="ml-2 text-xs text-slate-400">{i.type}</span>
                    </td>
                    <td className="td">
                      <Link href={`/customers/${i.customerId}`} className="text-slate-700 hover:text-brand-700">
                        {i.customerName}
                      </Link>
                    </td>
                    <td className="td">{i.doc}</td>
                    <td className="td">{fmtDate(i.expiry)}</td>
                    <td className={`td ${complianceTone(i.level)}`}>
                      {i.level === "expired" ? "Expired" : "Expiring"} · {i.label}
                    </td>
                    <td className="td text-right">
                      <Link href={`/vehicles/${i.vehicleId}`} className="text-xs text-brand-700 hover:underline">
                        renew
                      </Link>
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
