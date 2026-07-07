"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guard";
import { round2, toNumber } from "@/lib/money";
import { allocatePayment } from "@/lib/domain/allocation";
import { nextReceiptNo } from "./numbering";

const schema = z.object({
  loanId: z.string().min(1),
  amount: z.coerce.number().positive("Amount must be positive"),
  mode: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "CARD", "OTHER"]),
  reference: z.string().trim().optional(),
  paidAt: z.string().optional(),
  note: z.string().trim().optional(),
});

export async function recordPayment(
  _prev: { error?: string; ok?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  const user = await requireRole("ADMIN", "STAFF");

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const paidAt = d.paidAt ? new Date(d.paidAt) : new Date();
  if (isNaN(paidAt.getTime())) return { error: "Payment date is invalid." };

  const loan = await prisma.loan.findUnique({
    where: { id: d.loanId },
    include: { installments: true, charges: true },
  });
  if (!loan) return { error: "Loan not found." };

  // Build allocation input from live state.
  const alloc = allocatePayment({
    amount: d.amount,
    paidAt,
    zeroOverdueDiscountPct: toNumber(loan.zeroOverdueDiscountPct),
    charges: loan.charges
      .filter((c) => !c.waived)
      .map((c) => ({
        id: c.id,
        incurredOn: c.incurredOn,
        outstanding: round2(toNumber(c.amount) - toNumber(c.amountPaid)),
      })),
    installments: loan.installments.map((i) => ({
      id: i.id,
      seqNo: i.seqNo,
      dueDate: i.dueDate,
      interestOutstanding: round2(
        toNumber(i.interestDue) - toNumber(i.interestPaid) - toNumber(i.discountGiven),
      ),
      principalOutstanding: round2(toNumber(i.principalDue) - toNumber(i.principalPaid)),
    })),
  });

  const receiptNo = await nextReceiptNo();

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        receiptNo,
        loanId: loan.id,
        amount: d.amount,
        mode: d.mode,
        reference: d.reference || null,
        paidAt,
        note: d.note || null,
        receivedById: user.id,
        allocations: {
          create: alloc.allocations.map((a) => ({
            target: a.target,
            amount: a.amount,
            installmentId: a.installmentId,
            chargeId: a.chargeId,
          })),
        },
      },
    });

    // Apply installment outcomes.
    for (const o of alloc.installmentOutcomes) {
      const inst = loan.installments.find((i) => i.id === o.installmentId)!;
      const newInterestPaid = round2(toNumber(inst.interestPaid) + o.interestPaid);
      const newPrincipalPaid = round2(toNumber(inst.principalPaid) + o.principalPaid);
      const newDiscount = round2(toNumber(inst.discountGiven) + o.discountGiven);
      const interestSettled =
        newInterestPaid + newDiscount >= toNumber(inst.interestDue) - 0.005;
      const principalSettled = newPrincipalPaid >= toNumber(inst.principalDue) - 0.005;
      const fully = interestSettled && principalSettled;
      const anyPaid = newInterestPaid + newPrincipalPaid > 0.005;

      await tx.installment.update({
        where: { id: inst.id },
        data: {
          interestPaid: newInterestPaid,
          principalPaid: newPrincipalPaid,
          discountGiven: newDiscount,
          status: fully ? "PAID" : anyPaid ? "PARTIAL" : inst.status,
          paidAt: fully ? paidAt : inst.paidAt,
        },
      });
    }

    // Apply charge payments.
    for (const cp of alloc.chargePayments) {
      const charge = loan.charges.find((c) => c.id === cp.chargeId)!;
      await tx.charge.update({
        where: { id: charge.id },
        data: { amountPaid: round2(toNumber(charge.amountPaid) + cp.amount) },
      });
    }

    // Collection ledger entry, split by the loan's co-lending shares.
    const applied = round2(d.amount - alloc.unappliedAmount);
    if (applied > 0.005) {
      const fShare = toNumber(loan.franchiseeSharePct) / 100;
      const franchiseeAmount = round2(applied * fShare);
      await tx.ledgerEntry.create({
        data: {
          franchiseeId: loan.franchiseeId,
          loanId: loan.id,
          direction: "COLLECTION",
          franchiseeAmount,
          headOfficeAmount: round2(applied - franchiseeAmount),
          description: `Collection ${receiptNo}`,
        },
      });
    }

    // Close the loan if everything is settled.
    const remainingInstallments = await tx.installment.count({
      where: { loanId: loan.id, status: { not: "PAID" } },
    });
    if (remainingInstallments === 0) {
      await tx.loan.update({
        where: { id: loan.id },
        data: { status: "CLOSED", closedAt: paidAt },
      });
    }

    return payment;
  });

  // Mark still-overdue installments so lists render correctly.
  await refreshOverdueFlags(loan.id);

  revalidatePath(`/loans/${loan.id}`);
  revalidatePath("/loans");
  revalidatePath("/dashboard");

  const parts: string[] = [`Receipt ${receiptNo} recorded.`];
  if (alloc.totalDiscount > 0)
    parts.push(`Zero-overdue discount ₹${alloc.totalDiscount.toFixed(2)} applied.`);
  if (alloc.unappliedAmount > 0)
    parts.push(`₹${alloc.unappliedAmount.toFixed(2)} left unapplied (advance).`);
  return { ok: parts.join(" ") };
}

/** Flag past-due unpaid installments as OVERDUE. */
export async function refreshOverdueFlags(loanId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const installments = await prisma.installment.findMany({ where: { loanId } });
  for (const i of installments) {
    const outstanding =
      toNumber(i.principalDue) - toNumber(i.principalPaid) +
      (toNumber(i.interestDue) - toNumber(i.interestPaid) - toNumber(i.discountGiven));
    const pastDue = new Date(i.dueDate) < today;
    if (i.status === "PAID") continue;
    const desired =
      outstanding > 0.005 && pastDue
        ? "OVERDUE"
        : toNumber(i.principalPaid) + toNumber(i.interestPaid) > 0.005
          ? "PARTIAL"
          : "PENDING";
    if (desired !== i.status) {
      await prisma.installment.update({ where: { id: i.id }, data: { status: desired } });
    }
  }
}
