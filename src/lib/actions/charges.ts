"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guard";
import { toNumber } from "@/lib/money";
import { computeLoanPosition, computePenalty } from "@/lib/domain/outstanding";

const CHARGE_TYPES = [
  "LATE_PENALTY",
  "OVERDUE_INTEREST",
  "TOWING",
  "COLLECTION",
  "LEGAL",
  "BOUNCE",
  "OTHER",
] as const;

const addSchema = z.object({
  loanId: z.string().min(1),
  type: z.enum(CHARGE_TYPES),
  amount: z.coerce.number().positive("Amount must be positive"),
  description: z.string().trim().optional(),
});

export async function addCharge(
  _prev: { error?: string; ok?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  await requireRole("ADMIN", "STAFF");

  const parsed = addSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  await prisma.charge.create({
    data: {
      loanId: d.loanId,
      type: d.type,
      amount: d.amount,
      description: d.description || null,
    },
  });

  revalidatePath(`/loans/${d.loanId}`);
  return { ok: "Charge added." };
}

/** Compute the current late penalty and post it as a LATE_PENALTY charge. */
export async function applyPenalty(
  _prev: { error?: string; ok?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  await requireRole("ADMIN", "STAFF");
  const loanId = String(formData.get("loanId") ?? "");
  if (!loanId) return { error: "Missing loan." };

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: { installments: true, charges: true },
  });
  if (!loan) return { error: "Loan not found." };

  const pos = computeLoanPosition(loan.installments, loan.charges);
  const penalty = computePenalty(loan, pos.overdueAmount, pos.daysPastDue);
  if (penalty <= 0) {
    return { error: "No overdue amount — nothing to charge." };
  }

  await prisma.charge.create({
    data: {
      loanId,
      type: "LATE_PENALTY",
      amount: penalty,
      description: `${loan.penaltyRatePctPerMonth}%/mo on ₹${pos.overdueAmount.toFixed(
        2,
      )} overdue for ${pos.daysPastDue} day(s)`,
    },
  });

  revalidatePath(`/loans/${loanId}`);
  return { ok: `Penalty of ₹${penalty.toFixed(2)} applied.` };
}

export async function waiveCharge(
  _prev: { error?: string; ok?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  await requireRole("ADMIN", "STAFF");
  const chargeId = String(formData.get("chargeId") ?? "");
  const loanId = String(formData.get("loanId") ?? "");
  if (!chargeId) return { error: "Missing charge." };

  const charge = await prisma.charge.findUnique({ where: { id: chargeId } });
  if (!charge) return { error: "Charge not found." };
  if (toNumber(charge.amountPaid) > 0.005) {
    return { error: "Cannot waive a charge that has already been partly paid." };
  }

  await prisma.charge.update({ where: { id: chargeId }, data: { waived: true } });
  revalidatePath(`/loans/${loanId}`);
  return { ok: "Charge waived." };
}
