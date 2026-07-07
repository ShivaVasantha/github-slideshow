"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guard";
import { round2 } from "@/lib/money";
import { franchiseePosition } from "@/lib/domain/settlement";
import { nextSettlementRef } from "./numbering";

const schema = z.object({
  franchiseeId: z.string().min(1),
  amount: z.coerce.number().positive("Amount must be positive"),
  method: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "CARD", "OTHER"]),
  settledOn: z.string().optional(),
  note: z.string().trim().optional(),
});

/** Record a pay-out to a franchisee, capped at the current net payable. */
export async function recordSettlement(
  _prev: { error?: string; ok?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  const user = await requireRole("ADMIN", "STAFF");

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const settledOn = d.settledOn ? new Date(d.settledOn) : new Date();
  if (isNaN(settledOn.getTime())) return { error: "Settlement date is invalid." };

  const franchisee = await prisma.franchisee.findUnique({
    where: { id: d.franchiseeId },
    include: { ledger: true, settlements: true },
  });
  if (!franchisee) return { error: "Franchisee not found." };

  const pos = franchiseePosition(franchisee.ledger, franchisee.settlements);
  const amount = round2(d.amount);
  if (amount > pos.netPayable + 0.005) {
    return {
      error: `Amount exceeds net payable (₹${pos.netPayable.toFixed(2)}).`,
    };
  }

  const reference = await nextSettlementRef();
  await prisma.settlement.create({
    data: {
      reference,
      franchiseeId: d.franchiseeId,
      amount,
      method: d.method,
      note: d.note || null,
      settledOn,
      createdById: user.id,
    },
  });

  revalidatePath(`/franchisees/${d.franchiseeId}`);
  revalidatePath("/franchisees");
  return { ok: `Settlement ${reference} of ₹${amount.toFixed(2)} recorded.` };
}
