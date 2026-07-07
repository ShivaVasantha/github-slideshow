import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { isStaff } from "@/lib/auth/guard";
import { logoutAction } from "@/lib/auth/actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const staff = isStaff(user);

  const nav: { href: string; label: string; show: boolean }[] = [
    { href: "/dashboard", label: "Dashboard", show: true },
    { href: "/loans", label: "Loans", show: true },
    { href: "/customers", label: "Customers", show: staff },
    { href: "/vehicles", label: "Vehicles", show: staff },
    { href: "/franchisees", label: "Franchisees", show: user.role === "ADMIN" || user.role === "STAFF" },
  ];

  return (
    <div className="min-h-screen lg:flex">
      <aside className="flex flex-col border-r border-slate-200 bg-white lg:w-64">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="text-lg font-bold text-brand-700">HLF Finance</div>
          <div className="text-xs text-slate-400">Hosur, Tamil Nadu</div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav
            .filter((n) => n.show)
            .map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {n.label}
              </Link>
            ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <div className="mb-2 text-sm font-medium text-slate-700">{user.name}</div>
          <div className="mb-3 text-xs text-slate-400">{roleLabel(user.role)}</div>
          <form action={logoutAction}>
            <button className="btn-secondary w-full text-xs" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
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
