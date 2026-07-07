import "server-only";
import { prisma } from "@/lib/prisma";
import { round2, toNumber } from "@/lib/money";
import { computeLoanPosition } from "@/lib/domain/outstanding";

/**
 * Report queries + aggregation, shared by the /reports page and the CSV export
 * route so both always show the same numbers.
 */

export type AgeingBucket = "Current" | "1-30" | "31-60" | "61-90" | "90+";

export interface AgeingRow {
  loanId: string;
  agreementNo: string;
  customer: string;
  franchisee: string;
  outstanding: number;
  overdue: number;
  daysPastDue: number;
  bucket: AgeingBucket;
}

export interface AgeingReport {
  rows: AgeingRow[];
  bucketTotals: Record<AgeingBucket, number>; // overdue amount per bucket (Current = 0)
  totalOutstanding: number;
  totalOverdue: number;
}

function bucketFor(overdue: number, dpd: number): AgeingBucket {
  if (overdue <= 0.5) return "Current";
  if (dpd <= 30) return "1-30";
  if (dpd <= 60) return "31-60";
  if (dpd <= 90) return "61-90";
  return "90+";
}

export async function getAgeingReport(): Promise<AgeingReport> {
  const loans = await prisma.loan.findMany({
    where: { status: { in: ["ACTIVE"] } },
    include: { installments: true, charges: true, customer: true, franchisee: true },
    orderBy: { agreementNo: "asc" },
  });

  const bucketTotals: Record<AgeingBucket, number> = {
    Current: 0,
    "1-30": 0,
    "31-60": 0,
    "61-90": 0,
    "90+": 0,
  };
  let totalOutstanding = 0;
  let totalOverdue = 0;

  const rows: AgeingRow[] = loans.map((l) => {
    const pos = computeLoanPosition(l.installments, l.charges);
    const bucket = bucketFor(pos.overdueAmount, pos.daysPastDue);
    bucketTotals[bucket] = round2(bucketTotals[bucket] + pos.overdueAmount);
    totalOutstanding = round2(totalOutstanding + pos.totalReceivable);
    totalOverdue = round2(totalOverdue + pos.overdueAmount);
    return {
      loanId: l.id,
      agreementNo: l.agreementNo,
      customer: l.customer.name,
      franchisee: l.franchisee.code,
      outstanding: pos.totalReceivable,
      overdue: pos.overdueAmount,
      daysPastDue: pos.daysPastDue,
      bucket,
    };
  });

  return { rows, bucketTotals, totalOutstanding, totalOverdue };
}

export interface CollectionRow {
  receiptNo: string;
  paidAt: Date;
  agreementNo: string;
  customer: string;
  franchisee: string;
  mode: string;
  amount: number;
}

export interface CollectionsReport {
  rows: CollectionRow[];
  total: number;
  count: number;
  from: Date;
  to: Date;
}

export async function getCollectionsReport(from: Date, to: Date): Promise<CollectionsReport> {
  // `to` is inclusive of the whole day.
  const toEnd = new Date(to);
  toEnd.setHours(23, 59, 59, 999);

  const payments = await prisma.payment.findMany({
    where: { paidAt: { gte: from, lte: toEnd } },
    include: { loan: { include: { customer: true, franchisee: true } } },
    orderBy: { paidAt: "desc" },
  });

  const rows: CollectionRow[] = payments.map((p) => ({
    receiptNo: p.receiptNo,
    paidAt: p.paidAt,
    agreementNo: p.loan.agreementNo,
    customer: p.loan.customer.name,
    franchisee: p.loan.franchisee.code,
    mode: p.mode,
    amount: toNumber(p.amount),
  }));

  const total = round2(rows.reduce((s, r) => s + r.amount, 0));
  return { rows, total, count: rows.length, from, to };
}

export interface PortfolioByFranchisee {
  code: string;
  name: string;
  loans: number;
  disbursed: number;
  outstanding: number;
}

export interface PortfolioByType {
  type: string;
  loans: number;
  disbursed: number;
  outstanding: number;
}

export interface PortfolioReport {
  byFranchisee: PortfolioByFranchisee[];
  byType: PortfolioByType[];
  totalDisbursed: number;
  totalOutstanding: number;
  activeLoans: number;
}

export async function getPortfolioReport(): Promise<PortfolioReport> {
  const loans = await prisma.loan.findMany({
    include: { installments: true, charges: true, franchisee: true, vehicle: true },
  });

  const fMap = new Map<string, PortfolioByFranchisee>();
  const tMap = new Map<string, PortfolioByType>();
  let totalDisbursed = 0;
  let totalOutstanding = 0;
  let activeLoans = 0;

  for (const l of loans) {
    const disbursed = toNumber(l.principal);
    const outstanding = computeLoanPosition(l.installments, l.charges).totalReceivable;
    totalDisbursed = round2(totalDisbursed + disbursed);
    totalOutstanding = round2(totalOutstanding + outstanding);
    if (l.status === "ACTIVE") activeLoans += 1;

    const f = fMap.get(l.franchiseeId) ?? {
      code: l.franchisee.code,
      name: l.franchisee.name,
      loans: 0,
      disbursed: 0,
      outstanding: 0,
    };
    f.loans += 1;
    f.disbursed = round2(f.disbursed + disbursed);
    f.outstanding = round2(f.outstanding + outstanding);
    fMap.set(l.franchiseeId, f);

    const typeKey = l.vehicle.type;
    const t = tMap.get(typeKey) ?? { type: typeKey, loans: 0, disbursed: 0, outstanding: 0 };
    t.loans += 1;
    t.disbursed = round2(t.disbursed + disbursed);
    t.outstanding = round2(t.outstanding + outstanding);
    tMap.set(typeKey, t);
  }

  return {
    byFranchisee: [...fMap.values()].sort((a, b) => a.code.localeCompare(b.code)),
    byType: [...tMap.values()].sort((a, b) => b.outstanding - a.outstanding),
    totalDisbursed,
    totalOutstanding,
    activeLoans,
  };
}
