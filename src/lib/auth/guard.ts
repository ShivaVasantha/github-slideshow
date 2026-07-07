import "server-only";
import { redirect } from "next/navigation";
import type { Prisma, Role } from "@prisma/client";
import { getSession, type SessionUser } from "./session";

/** Require a logged-in user; redirect to /login if absent. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

/** Require one of the given roles; redirect to /login if unauthorised. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/login");
  return user;
}

export function isStaff(user: SessionUser): boolean {
  return user.role === "ADMIN" || user.role === "STAFF";
}

/**
 * Build a Prisma `where` fragment that limits Loan queries to what the current
 * user is allowed to see: staff/admin see everything, a franchisee sees their
 * own portfolio, a borrower sees only their loans.
 */
export function loanScopeWhere(user: SessionUser): Prisma.LoanWhereInput {
  switch (user.role) {
    case "ADMIN":
    case "STAFF":
      return {};
    case "FRANCHISEE":
      return { franchiseeId: user.franchiseeId ?? "__none__" };
    case "BORROWER":
      return { customerId: user.customerId ?? "__none__" };
    default:
      return { id: "__none__" };
  }
}
