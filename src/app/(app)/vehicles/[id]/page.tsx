import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guard";
import { complianceStatus, complianceTone } from "@/lib/domain/compliance";
import { Money, PageHeader, Badge } from "@/components/ui";
import { RenewForm } from "./renew-form";

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}
function isoDate(d: Date | null): string | null {
  return d ? new Date(d).toISOString().slice(0, 10) : null;
}

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN", "STAFF");
  const { id } = await params;

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      customer: true,
      loans: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!vehicle) notFound();

  const docs = [
    {
      doc: "insurance" as const,
      label: "Insurance",
      expiry: vehicle.insuranceExpiry,
      extra: [vehicle.insuranceProvider, vehicle.insurancePolicyNo].filter(Boolean).join(" · ") || null,
    },
    { doc: "fitness" as const, label: "Fitness certificate", expiry: vehicle.fitnessExpiry, extra: null },
    {
      doc: "permit" as const,
      label: "Permit",
      expiry: vehicle.permitExpiry,
      extra: vehicle.permitType,
    },
  ];

  return (
    <div>
      <PageHeader
        title={vehicle.registrationNo}
        subtitle={`${vehicle.type.replaceAll("_", " ")} · ${[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "—"}`}
        action={
          <Link href={`/customers/${vehicle.customerId}`} className="btn-secondary">
            Owner: {vehicle.customer.name}
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 text-sm lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-slate-500">Vehicle</h2>
          <dl className="space-y-2">
            <Row label="Type" value={vehicle.type.replaceAll("_", " ")} />
            <Row label="Make / Model" value={[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "—"} />
            <Row label="Year" value={vehicle.manufactureYear?.toString() ?? "—"} />
            <Row label="Engine no." value={vehicle.engineNo ?? "—"} />
            <Row label="Chassis no." value={vehicle.chassisNo ?? "—"} />
          </dl>
        </div>

        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-500">Compliance</h2>
          <div className="space-y-3">
            {docs.map((d) => {
              const st = complianceStatus(d.expiry);
              return (
                <div key={d.doc} className="card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{d.label}</div>
                      {d.extra && <div className="text-xs text-slate-400">{d.extra}</div>}
                    </div>
                    <div className="text-right">
                      <div className={`text-sm ${complianceTone(st.level)}`}>
                        {fmtDate(d.expiry)}
                      </div>
                      <div className={`text-xs ${complianceTone(st.level)}`}>{st.label}</div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <RenewForm
                      vehicleId={vehicle.id}
                      doc={d.doc}
                      label={d.label}
                      currentExpiry={isoDate(d.expiry)}
                      currentProvider={vehicle.insuranceProvider}
                      currentPolicy={vehicle.insurancePolicyNo}
                      currentPermitType={vehicle.permitType}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Loans against this vehicle</h2>
        {vehicle.loans.length === 0 ? (
          <p className="text-sm text-slate-400">None.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Agreement</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Principal</th>
                  <th className="th text-right">EMI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicle.loans.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="td">
                      <Link href={`/loans/${l.id}`} className="font-medium text-brand-700">
                        {l.agreementNo}
                      </Link>
                    </td>
                    <td className="td"><Badge value={l.status} /></td>
                    <td className="td text-right"><Money value={l.principal} /></td>
                    <td className="td text-right"><Money value={l.emiAmount} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Link href="/vehicles" className="text-sm text-brand-700 hover:underline">
          ← Back to vehicles
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-700">{value}</dd>
    </div>
  );
}
