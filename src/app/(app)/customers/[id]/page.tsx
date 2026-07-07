import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guard";
import { Money, PageHeader, Badge, LinkButton } from "@/components/ui";
import { AddVehicleForm } from "./vehicle-form";

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

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN", "STAFF");
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      vehicles: { orderBy: { createdAt: "desc" } },
      loans: { include: { vehicle: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!customer) notFound();

  return (
    <div>
      <PageHeader
        title={customer.name}
        subtitle={`${customer.code} · ${customer.phone ?? "no phone"}`}
        action={<LinkButton href="/loans/new">+ New loan</LinkButton>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 text-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-500">Profile</h2>
          <dl className="space-y-2">
            <Row label="Address" value={[customer.address, customer.city, customer.pincode].filter(Boolean).join(", ") || "—"} />
            <Row label="Email" value={customer.email ?? "—"} />
            <Row label="Aadhaar" value={customer.aadhaarNo ?? "—"} />
            <Row label="PAN" value={customer.panNo ?? "—"} />
            <Row label="Guarantor" value={customer.guarantorName ? `${customer.guarantorName} · ${customer.guarantorPhone ?? ""}` : "—"} />
          </dl>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-500">Vehicles</h2>
          </div>
          {customer.vehicles.length === 0 ? (
            <p className="mb-3 text-sm text-slate-400">No vehicles on record.</p>
          ) : (
            <div className="card mb-3 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Reg. no.</th>
                    <th className="th">Type</th>
                    <th className="th">Insurance exp.</th>
                    <th className="th">Fitness exp.</th>
                    <th className="th">Permit exp.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customer.vehicles.map((v) => (
                    <tr key={v.id}>
                      <td className="td font-medium">
                        <Link href={`/vehicles/${v.id}`} className="text-brand-700">
                          {v.registrationNo}
                        </Link>
                      </td>
                      <td className="td">{v.type.replaceAll("_", " ")}</td>
                      <td className={`td ${expiryTone(v.insuranceExpiry)}`}>{fmtDate(v.insuranceExpiry)}</td>
                      <td className={`td ${expiryTone(v.fitnessExpiry)}`}>{fmtDate(v.fitnessExpiry)}</td>
                      <td className={`td ${expiryTone(v.permitExpiry)}`}>{fmtDate(v.permitExpiry)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <AddVehicleForm customerId={customer.id} />
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Loans</h2>
        {customer.loans.length === 0 ? (
          <p className="text-sm text-slate-400">No loans yet.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Agreement</th>
                  <th className="th">Vehicle</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Principal</th>
                  <th className="th text-right">EMI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customer.loans.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="td">
                      <Link href={`/loans/${l.id}`} className="font-medium text-brand-700">
                        {l.agreementNo}
                      </Link>
                    </td>
                    <td className="td">{l.vehicle.registrationNo}</td>
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
        <Link href="/customers" className="text-sm text-brand-700 hover:underline">
          ← Back to customers
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
