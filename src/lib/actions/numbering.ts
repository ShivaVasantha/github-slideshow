import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Simple human-readable sequential codes. Derived from the current row count;
 * adequate for a single-tenant back office. A high-concurrency deployment
 * would move these to a dedicated counter table.
 */

export async function nextCustomerCode(): Promise<string> {
  const n = await prisma.customer.count();
  return `CUS-${String(n + 1).padStart(6, "0")}`;
}

export async function nextAgreementNo(): Promise<string> {
  const year = new Date().getFullYear();
  const n = await prisma.loan.count();
  return `AGR-${year}-${String(n + 1).padStart(6, "0")}`;
}

export async function nextReceiptNo(): Promise<string> {
  const year = new Date().getFullYear();
  const n = await prisma.payment.count();
  return `RCP-${year}-${String(n + 1).padStart(6, "0")}`;
}

export async function nextSettlementRef(): Promise<string> {
  const year = new Date().getFullYear();
  const n = await prisma.settlement.count();
  return `STL-${year}-${String(n + 1).padStart(6, "0")}`;
}
