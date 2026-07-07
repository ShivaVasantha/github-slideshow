import { addMonths } from "date-fns";
import { round2 } from "../money";

export type InterestMethod = "FLAT" | "REDUCING";

export interface ScheduleInput {
  principal: number;
  annualRatePct: number;
  tenureMonths: number;
  method: InterestMethod;
  firstEmiDate: Date;
}

export interface ScheduleRow {
  seqNo: number;
  dueDate: Date;
  principalDue: number;
  interestDue: number;
  totalDue: number;
}

export interface ScheduleResult {
  emiAmount: number;
  rows: ScheduleRow[];
  totalInterest: number;
  totalPayable: number;
}

/**
 * Compute the level EMI amount.
 *
 * FLAT: interest is charged on the original principal for the whole tenure,
 * then (principal + total interest) is spread evenly. Common for vehicle
 * finance in this market.
 *
 * REDUCING: standard amortised EMI on the outstanding balance.
 */
export function computeEmi(input: Omit<ScheduleInput, "firstEmiDate">): number {
  const { principal, annualRatePct, tenureMonths, method } = input;
  if (tenureMonths <= 0) return 0;

  if (method === "FLAT") {
    const totalInterest = (principal * annualRatePct * (tenureMonths / 12)) / 100;
    return round2((principal + totalInterest) / tenureMonths);
  }

  // REDUCING balance amortisation.
  const r = annualRatePct / 100 / 12;
  if (r === 0) return round2(principal / tenureMonths);
  const factor = Math.pow(1 + r, tenureMonths);
  return round2((principal * r * factor) / (factor - 1));
}

/**
 * Build the full installment schedule. The final installment absorbs any
 * rounding residue so the sum of principalDue exactly equals the principal and
 * the sum of totalDue equals principal + total interest.
 */
export function buildSchedule(input: ScheduleInput): ScheduleResult {
  const { principal, annualRatePct, tenureMonths, method, firstEmiDate } = input;
  const emi = computeEmi(input);
  const rows: ScheduleRow[] = [];

  if (method === "FLAT") {
    const totalInterest = round2(
      (principal * annualRatePct * (tenureMonths / 12)) / 100,
    );
    const interestPer = round2(totalInterest / tenureMonths);
    const principalPer = round2(principal / tenureMonths);

    let principalRemaining = principal;
    let interestRemaining = totalInterest;

    for (let i = 0; i < tenureMonths; i++) {
      const isLast = i === tenureMonths - 1;
      const principalDue = isLast ? round2(principalRemaining) : principalPer;
      const interestDue = isLast ? round2(interestRemaining) : interestPer;
      principalRemaining = round2(principalRemaining - principalDue);
      interestRemaining = round2(interestRemaining - interestDue);
      rows.push({
        seqNo: i + 1,
        dueDate: addMonths(firstEmiDate, i),
        principalDue,
        interestDue,
        totalDue: round2(principalDue + interestDue),
      });
    }
  } else {
    // REDUCING: derive interest/principal split from the running balance.
    const r = annualRatePct / 100 / 12;
    let balance = principal;
    for (let i = 0; i < tenureMonths; i++) {
      const isLast = i === tenureMonths - 1;
      const interestDue = round2(balance * r);
      let principalDue = round2(emi - interestDue);
      let totalDue = emi;
      if (isLast) {
        // Close out exactly: last principal is whatever balance remains.
        principalDue = round2(balance);
        totalDue = round2(principalDue + interestDue);
      }
      balance = round2(balance - principalDue);
      rows.push({
        seqNo: i + 1,
        dueDate: addMonths(firstEmiDate, i),
        principalDue,
        interestDue,
        totalDue,
      });
    }
  }

  const totalInterest = round2(
    rows.reduce((s, row) => s + row.interestDue, 0),
  );
  const totalPayable = round2(rows.reduce((s, row) => s + row.totalDue, 0));

  return { emiAmount: emi, rows, totalInterest, totalPayable };
}
