"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guard";

const VEHICLE_TYPES = [
  "TAXI",
  "TRANSPORT",
  "PERSONAL",
  "GOODS_CARRIER",
  "TRACTOR",
  "EARTHMOVER",
  "BULLDOZER",
  "OTHER",
] as const;

const schema = z.object({
  customerId: z.string().min(1),
  registrationNo: z.string().trim().min(3, "Registration number is required"),
  type: z.enum(VEHICLE_TYPES),
  make: z.string().trim().optional(),
  model: z.string().trim().optional(),
  manufactureYear: z.coerce.number().int().min(1950).max(2100).optional(),
  engineNo: z.string().trim().optional(),
  chassisNo: z.string().trim().optional(),
  insuranceProvider: z.string().trim().optional(),
  insurancePolicyNo: z.string().trim().optional(),
  insuranceExpiry: z.string().trim().optional(),
  fitnessExpiry: z.string().trim().optional(),
  permitType: z.string().trim().optional(),
  permitExpiry: z.string().trim().optional(),
});

function toDate(v?: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export async function createVehicle(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireRole("ADMIN", "STAFF");

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const existing = await prisma.vehicle.findUnique({
    where: { registrationNo: d.registrationNo.toUpperCase() },
  });
  if (existing) {
    return { error: `Vehicle ${d.registrationNo} already exists.` };
  }

  await prisma.vehicle.create({
    data: {
      customerId: d.customerId,
      registrationNo: d.registrationNo.toUpperCase(),
      type: d.type,
      make: d.make || null,
      model: d.model || null,
      manufactureYear: d.manufactureYear ?? null,
      engineNo: d.engineNo || null,
      chassisNo: d.chassisNo || null,
      insuranceProvider: d.insuranceProvider || null,
      insurancePolicyNo: d.insurancePolicyNo || null,
      insuranceExpiry: toDate(d.insuranceExpiry),
      fitnessExpiry: toDate(d.fitnessExpiry),
      permitType: d.permitType || null,
      permitExpiry: toDate(d.permitExpiry),
    },
  });

  revalidatePath(`/customers/${d.customerId}`);
  revalidatePath("/vehicles");
  redirect(`/customers/${d.customerId}`);
}
