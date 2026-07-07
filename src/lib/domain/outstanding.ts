import { differenceInCalendarDays } from "date-fns";
import { round2, toNumber } from "../money";
import type { Charge, Installment, Loan } from "@prisma/client";

/**
 * Roll up a loan's live position from its installments and charges:
 * outstanding balances, overdue amount, days past due, and total collected.
 */

export interface LoanPosition {
  principalOutstanding: number;
  interestOutstanding: number;
  totalOutstanding: number; // principal + interest still owed on the schedule
  chargesOutstanding: number;
  totalReceivable: number; // everything still owed including charges
  overdueAmount: number; // dues on installments past their date
  overdueInstallments: number;
  daysPastDue: number; // since the oldest unpaid past-due installment
  totalDiscountGiven: number;
  paidPrincipal: number;
  paidInterest: number;
  nextDueDate: Date | null;
  nextDueAmount: number;
  isFullyPaid: boolean;
}

export function computeLoanPosition(
  installments: Installment[],
  charges: Charge[],
  asOf: Date = new Date(),
): LoanPosition {
  const today = startOfDay(asOf);

  let principalOutstanding = 0;
  let interestOutstanding = 0;
  let overdueAmount = 0;
  let overdueInstallments = 0;
  let totalDiscountGiven = 0;
  let paidPrincipal = 0;
  let paidInterest = 0;
  let oldestOverdueDate: Date | null = null;
  let nextDueDate: Date | null = null;
  let nextDueAmount = 0;

  const sorted = [...installments].sort((a, b) => a.seqNo - b.seqNo);

  for (const inst of sorted) {
    const pOut = round2(toNumber(inst.principalDue) - toNumber(inst.principalPaid));
    // Interest is settled by cash paid AND any zero-overdue discount granted.
    const iOut = round2(
      toNumber(inst.interestDue) - toNumber(inst.interestPaid) - toNumber(inst.discountGiven),
    );
    const rowOut = round2(Math.max(0, pOut) + Math.max(0, iOut));

    principalOutstanding = round2(principalOutstanding + Math.max(0, pOut));
    interestOutstanding = round2(interestOutstanding + Math.max(0, iOut));
    paidPrincipal = round2(paidPrincipal + toNumber(inst.principalPaid));
    paidInterest = round2(paidInterest + toNumber(inst.interestPaid));
    totalDiscountGiven = round2(totalDiscountGiven + toNumber(inst.discountGiven));

    const due = startOfDay(inst.dueDate);
    const isPastDue = due.getTime() < today.getTime();

    if (rowOut > 0.005) {
      if (isPastDue) {
        overdueAmount = round2(overdueAmount + rowOut);
        overdueInstallments += 1;
        if (!oldestOverdueDate) oldestOverdueDate = due;
      } else if (!nextDueDate) {
        nextDueDate = due;
        nextDueAmount = rowOut;
      }
    }
  }

  const chargesOutstanding = round2(
    charges
      .filter((c) => !c.waived)
      .reduce((s, c) => s + Math.max(0, toNumber(c.amount) - toNumber(c.amountPaid)), 0),
  );

  const totalOutstanding = round2(principalOutstanding + interestOutstanding);
  const daysPastDue = oldestOverdueDate
    ? Math.max(0, differenceInCalendarDays(today, oldestOverdueDate))
    : 0;

  return {
    principalOutstanding,
    interestOutstanding,
    totalOutstanding,
    chargesOutstanding,
    totalReceivable: round2(totalOutstanding + chargesOutstanding),
    overdueAmount,
    overdueInstallments,
    daysPastDue,
    totalDiscountGiven,
    paidPrincipal,
    paidInterest,
    nextDueDate,
    nextDueAmount,
    isFullyPaid: totalOutstanding <= 0.005,
  };
}

/**
 * Suggested late-payment penalty for the currently overdue dues:
 * rate% per month (pro-rated by days) applied to the overdue amount.
 */
export function computePenalty(
  loan: Pick<Loan, "penaltyRatePctPerMonth">,
  overdueAmount: number,
  daysPastDue: number,
): number {
  if (overdueAmount <= 0 || daysPastDue <= 0) return 0;
  const ratePerMonth = toNumber(loan.penaltyRatePctPerMonth) / 100;
  const months = daysPastDue / 30;
  return round2(overdueAmount * ratePerMonth * months);
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
