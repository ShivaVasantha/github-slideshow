import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guard";
import { PageHeader, EmptyState } from "@/components/ui";

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}
function expiryTone(d: Date | null): string {
  if (!d) return "text-slate-400";
  const days = (new Date(d).getTime() - Date.now()) / 86400000;
  if (days < 0) return "text-rose-600 font-medium";
  if (days < 45) return "text-amber-600 font-medium";
  return "text-slate-600";
}

export default async function VehiclesPage() {
  await requireRole("ADMIN", "STAFF");

  const vehicles = await prisma.vehicle.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: true },
  });

  return (
    <div>
      <PageHeader
        title="Vehicles"
        subtitle={`${vehicles.length} vehicle(s) · red = expired, amber = expiring within 45 days`}
      />
      {vehicles.length === 0 ? (
        <EmptyState>No vehicles yet. Add vehicles from a customer profile.</EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Reg. no.</th>
                <th className="th">Type</th>
                <th className="th">Owner</th>
                <th className="th">Insurance</th>
                <th className="th">Fitness</th>
                <th className="th">Permit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="td font-medium">
                    <Link href={`/vehicles/${v.id}`} className="text-brand-700">
                      {v.registrationNo}
                    </Link>
                  </td>
                  <td className="td">{v.type.replaceAll("_", " ")}</td>
                  <td className="td">
                    <Link href={`/customers/${v.customerId}`} className="text-brand-700">
                      {v.customer.name}
                    </Link>
                  </td>
                  <td className={`td ${expiryTone(v.insuranceExpiry)}`}>{fmtDate(v.insuranceExpiry)}</td>
                  <td className={`td ${expiryTone(v.fitnessExpiry)}`}>{fmtDate(v.fitnessExpiry)}</td>
                  <td className={`td ${expiryTone(v.permitExpiry)}`}>{fmtDate(v.permitExpiry)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
