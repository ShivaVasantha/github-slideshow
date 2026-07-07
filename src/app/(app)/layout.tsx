import { requireUser, isStaff } from "@/lib/auth/guard";
import { AppShell, type NavItem } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const staff = isStaff(user);

  const nav: (NavItem & { show: boolean })[] = [
    { href: "/dashboard", label: "Dashboard", show: true },
    { href: "/loans", label: "Loans", show: true },
    { href: "/customers", label: "Customers", show: staff },
    { href: "/vehicles", label: "Vehicles", show: staff },
    { href: "/compliance", label: "Compliance", show: staff },
    { href: "/franchisees", label: "Franchisees", show: staff },
    { href: "/reports", label: "Reports", show: staff },
    {
      href: user.franchiseeId ? `/franchisees/${user.franchiseeId}` : "/dashboard",
      label: "My statement",
      show: user.role === "FRANCHISEE" && !!user.franchiseeId,
    },
  ];

  return (
    <AppShell
      nav={nav.filter((n) => n.show).map(({ href, label }) => ({ href, label }))}
      userName={user.name}
      roleLabel={roleLabel(user.role)}
    >
      {children}
    </AppShell>
  );
}

function roleLabel(role: string): string {
  return (
    {
      ADMIN: "Administrator",
      STAFF: "Head-office staff",
      FRANCHISEE: "HLF Franchisee",
      BORROWER: "Borrower",
    }[role] ?? role
  );
}
