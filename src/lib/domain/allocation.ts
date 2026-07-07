import { round2 } from "../money";

/**
 * Payment allocation waterfall.
 *
 * A received payment is applied in this order:
 *   1. Outstanding charges (penalties, overdue interest, towing, legal…),
 *      oldest first.
 *   2. Interest due on installments, oldest first.
 *   3. Principal due on installments, oldest first.
 *
 * Zero-overdue discount: if the borrower is fully current (no past-due
 * installment, no outstanding charges) and the payment fully settles an
 * on-time installment, the configured discount is applied on that
 * installment's interest as a reward.
 *
 * The function is pure so it can be unit-reasoned and reused by the server
 * action that persists the result.
 */

export interface AllocInstallmentState {
  id: string;
  seqNo: number;
  dueDate: Date;
  interestOutstanding: number;
  principalOutstanding: number;
}

export interface AllocChargeState {
  id: string;
  incurredOn: Date;
  outstanding: number;
}

export interface AllocInput {
  amount: number;
  paidAt: Date;
  charges: AllocChargeState[];
  installments: AllocInstallmentState[];
  zeroOverdueDiscountPct: number;
}

export type AllocationTarget = "PRINCIPAL" | "INTEREST" | "CHARGE";

export interface Allocation {
  target: AllocationTarget;
  amount: number;
  installmentId?: string;
  chargeId?: string;
}

export interface InstallmentOutcome {
  installmentId: string;
  interestPaid: number;
  principalPaid: number;
  discountGiven: number;
  fullySettled: boolean;
}

export interface AllocationResult {
  allocations: Allocation[];
  installmentOutcomes: InstallmentOutcome[];
  chargePayments: { chargeId: string; amount: number; fullyPaid: boolean }[];
  totalDiscount: number;
  unappliedAmount: number; // advance / overpayment left after settling everything
}

export function allocatePayment(input: AllocInput): AllocationResult {
  const { paidAt, zeroOverdueDiscountPct } = input;
  let remaining = round2(input.amount);

  const allocations: Allocation[] = [];
  const installmentOutcomes: InstallmentOutcome[] = [];
  const chargePayments: { chargeId: string; amount: number; fullyPaid: boolean }[] = [];
  let totalDiscount = 0;

  // --- 1. Charges, oldest first --------------------------------------------
  const charges = [...input.charges].sort(
    (a, b) => a.incurredOn.getTime() - b.incurredOn.getTime(),
  );
  const hadOutstandingCharges = charges.some((c) => c.outstanding > 0.005);

  for (const charge of charges) {
    if (remaining <= 0.005) break;
    const outstanding = round2(charge.outstanding);
    if (outstanding <= 0.005) continue;
    const pay = round2(Math.min(remaining, outstanding));
    remaining = round2(remaining - pay);
    allocations.push({ target: "CHARGE", amount: pay, chargeId: charge.id });
    chargePayments.push({
      chargeId: charge.id,
      amount: pay,
      fullyPaid: pay >= outstanding - 0.005,
    });
  }

  // --- 2 & 3. Installments, oldest first -----------------------------------
  const installments = [...input.installments].sort((a, b) => a.seqNo - b.seqNo);

  // Track whether the borrower is still "current" as we walk forward. Starts
  // false if there were any outstanding charges at the time of payment.
  let stillCurrent = !hadOutstandingCharges;

  for (const inst of installments) {
    const interestOut = round2(inst.interestOutstanding);
    const principalOut = round2(inst.principalOutstanding);
    const alreadySettled = interestOut <= 0.005 && principalOut <= 0.005;

    if (alreadySettled) continue;
    if (remaining <= 0.005) break;

    const isPastDue = inst.dueDate.getTime() < startOfDay(paidAt).getTime();
    if (isPastDue) stillCurrent = false;

    // Determine discount eligibility for THIS installment.
    let discount = 0;
    const eligible =
      stillCurrent && !isPastDue && zeroOverdueDiscountPct > 0 && interestOut > 0;
    if (eligible) {
      const candidateDiscount = round2(
        (interestOut * zeroOverdueDiscountPct) / 100,
      );
      const netInterest = round2(interestOut - candidateDiscount);
      const neededToSettle = round2(netInterest + principalOut);
      // Only grant the discount if the payment fully clears the installment.
      if (remaining >= neededToSettle - 0.005) {
        discount = candidateDiscount;
      }
    }

    const interestToCollect = round2(interestOut - discount);

    // Interest first.
    const interestPay = round2(Math.min(remaining, interestToCollect));
    remaining = round2(remaining - interestPay);
    if (interestPay > 0.005) {
      allocations.push({
        target: "INTEREST",
        amount: interestPay,
        installmentId: inst.id,
      });
    }

    // Principal next.
    let principalPay = 0;
    if (remaining > 0.005 && principalOut > 0.005) {
      principalPay = round2(Math.min(remaining, principalOut));
      remaining = round2(remaining - principalPay);
      allocations.push({
        target: "PRINCIPAL",
        amount: principalPay,
        installmentId: inst.id,
      });
    }

    // Discount only realised if interest was fully collected (net of discount).
    const interestFullyPaid = interestPay >= interestToCollect - 0.005;
    const principalFullyPaid = principalPay >= principalOut - 0.005;
    const realisedDiscount = interestFullyPaid ? discount : 0;
    if (realisedDiscount > 0) totalDiscount = round2(totalDiscount + realisedDiscount);

    const fullySettled = interestFullyPaid && principalFullyPaid;
    if (!fullySettled) stillCurrent = false;

    installmentOutcomes.push({
      installmentId: inst.id,
      interestPaid: interestPay,
      principalPaid: principalPay,
      discountGiven: realisedDiscount,
      fullySettled,
    });
  }

  return {
    allocations,
    installmentOutcomes,
    chargePayments,
    totalDiscount,
    unappliedAmount: round2(Math.max(0, remaining)),
  };
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
