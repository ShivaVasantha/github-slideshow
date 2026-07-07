"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guard";
import { round2 } from "@/lib/money";
import { buildSchedule } from "@/lib/domain/schedule";
import { nextAgreementNo } from "./numbering";

const schema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  vehicleId: z.string().min(1, "Select a vehicle"),
  franchiseeId: z.string().min(1, "Select a franchisee"),
  baseAmount: z.coerce.number().positive("Loan amount must be positive"),
  insuranceAmount: z.coerce.number().min(0).default(0),
  otherAddonAmount: z.coerce.number().min(0).default(0),
  interestRate: z.coerce.number().min(0).max(100),
  interestMethod: z.enum(["FLAT", "REDUCING"]),
  tenureMonths: z.coerce.number().int().min(1).max(120),
  processingFee: z.coerce.number().min(0).default(0),
  franchiseeSharePct: z.coerce.number().min(0).max(100),
  penaltyRatePctPerMonth: z.coerce.number().min(0).max(100).default(2),
  zeroOverdueDiscountPct: z.coerce.number().min(0).max(100).default(0),
  firstEmiDate: z.string().min(1, "First EMI date is required"),
  notes: z.string().trim().optional(),
});

export async function createLoan(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireRole("ADMIN", "STAFF");

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const firstEmiDate = new Date(d.firstEmiDate);
  if (isNaN(firstEmiDate.getTime())) {
    return { error: "First EMI date is invalid." };
  }

  // Verify the vehicle belongs to the chosen customer.
  const vehicle = await prisma.vehicle.findUnique({ where: { id: d.vehicleId } });
  if (!vehicle || vehicle.customerId !== d.customerId) {
    return { error: "Selected vehicle does not belong to the customer." };
  }

  const principal = round2(d.baseAmount + d.insuranceAmount + d.otherAddonAmount);
  const franchiseeSharePct = round2(d.franchiseeSharePct);
  const headOfficeSharePct = round2(100 - franchiseeSharePct);

  const schedule = buildSchedule({
    principal,
    annualRatePct: d.interestRate,
    tenureMonths: d.tenureMonths,
    method: d.interestMethod,
    firstEmiDate,
  });

  const agreementNo = await nextAgreementNo();
  const franchiseeAmount = round2((principal * franchiseeSharePct) / 100);
  const headOfficeAmount = round2(principal - franchiseeAmount);

  const loan = await prisma.$transaction(async (tx) => {
    const created = await tx.loan.create({
      data: {
        agreementNo,
        customerId: d.customerId,
        vehicleId: d.vehicleId,
        franchiseeId: d.franchiseeId,
        principal,
        interestRate: d.interestRate,
        interestMethod: d.interestMethod,
        tenureMonths: d.tenureMonths,
        emiAmount: schedule.emiAmount,
        processingFee: d.processingFee,
        franchiseeSharePct,
        headOfficeSharePct,
        penaltyRatePctPerMonth: d.penaltyRatePctPerMonth,
        zeroOverdueDiscountPct: d.zeroOverdueDiscountPct,
        status: "ACTIVE",
        firstEmiDate,
        disbursedAt: new Date(),
        notes: d.notes || null,
        installments: {
          create: schedule.rows.map((r) => ({
            seqNo: r.seqNo,
            dueDate: r.dueDate,
            principalDue: r.principalDue,
            interestDue: r.interestDue,
            totalDue: r.totalDue,
          })),
        },
      },
    });

    // Add-ons financed into the loan.
    if (d.insuranceAmount > 0) {
      await tx.loanAddon.create({
        data: {
          loanId: created.id,
          type: "INSURANCE",
          description: "Vehicle insurance financed into loan",
          amount: d.insuranceAmount,
        },
      });
    }
    if (d.otherAddonAmount > 0) {
      await tx.loanAddon.create({
        data: {
          loanId: created.id,
          type: "OTHER",
          description: "Other value-add services",
          amount: d.otherAddonAmount,
        },
      });
    }

    // Disbursement ledger entry — co-lending split.
    await tx.ledgerEntry.create({
      data: {
        franchiseeId: d.franchiseeId,
        loanId: created.id,
        direction: "DISBURSEMENT",
        franchiseeAmount,
        headOfficeAmount,
        description: `Disbursement of ${agreementNo}`,
      },
    });

    return created;
  });

  revalidatePath("/loans");
  revalidatePath("/dashboard");
  redirect(`/loans/${loan.id}`);
}
