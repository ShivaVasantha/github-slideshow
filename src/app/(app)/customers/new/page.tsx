import { requireRole } from "@/lib/auth/guard";
import { PageHeader } from "@/components/ui";
import { CustomerForm } from "./customer-form";

export default async function NewCustomerPage() {
  await requireRole("ADMIN", "STAFF");
  return (
    <div>
      <PageHeader title="New customer" subtitle="Register a borrower" />
      <CustomerForm />
    </div>
  );
}
