"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guard";
import { nextCustomerCode } from "./numbering";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  phone: z.string().trim().optional(),
  altPhone: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  pincode: z.string().trim().optional(),
  aadhaarNo: z.string().trim().optional(),
  panNo: z.string().trim().optional(),
  guarantorName: z.string().trim().optional(),
  guarantorPhone: z.string().trim().optional(),
  guarantorAddress: z.string().trim().optional(),
});

export async function createCustomer(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireRole("ADMIN", "STAFF");

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const customer = await prisma.customer.create({
    data: {
      code: await nextCustomerCode(),
      name: d.name,
      phone: d.phone || null,
      altPhone: d.altPhone || null,
      email: d.email || null,
      address: d.address || null,
      city: d.city || null,
      pincode: d.pincode || null,
      aadhaarNo: d.aadhaarNo || null,
      panNo: d.panNo || null,
      guarantorName: d.guarantorName || null,
      guarantorPhone: d.guarantorPhone || null,
      guarantorAddress: d.guarantorAddress || null,
    },
  });

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}
