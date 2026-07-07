import { PrismaClient, type InterestMethod } from "@prisma/client";
import bcrypt from "bcryptjs";
import { subMonths } from "date-fns";
import { buildSchedule } from "../src/lib/domain/schedule";
import { round2 } from "../src/lib/money";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "password123";

async function main() {
  console.log("Resetting data…");
  // Order matters for FK constraints.
  await prisma.paymentAllocation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.charge.deleteMany();
  await prisma.installment.deleteMany();
  await prisma.loanAddon.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.franchisee.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log("Creating franchisees…");
  const balaji = await prisma.franchisee.create({
    data: {
      code: "HLF-HSR-001",
      name: "Sri Balaji HLF",
      contactPerson: "R. Murugan",
      phone: "9843012345",
      email: "balaji@hlfpartners.in",
      address: "SIPCOT, Hosur",
      defaultFranchiseeSharePct: 80,
    },
  });
  const anand = await prisma.franchisee.create({
    data: {
      code: "HLF-HSR-002",
      name: "Anand Vehicle Finance HLF",
      contactPerson: "S. Anand",
      phone: "9843098765",
      email: "anand@hlfpartners.in",
      address: "Bagalur Road, Hosur",
      defaultFranchiseeSharePct: 75,
    },
  });

  console.log("Creating customers & vehicles…");
  const now = new Date();
  const in6m = subMonths(now, -6);
  const in1m = subMonths(now, -1);

  const c1 = await prisma.customer.create({
    data: {
      code: "CUS-000001",
      name: "Karthik Raja",
      phone: "9600011122",
      address: "12 Rayakottai Road",
      city: "Hosur",
      pincode: "635109",
      aadhaarNo: "4321 8765 0011",
      panNo: "ABCPK1234L",
      guarantorName: "Selvam R",
      guarantorPhone: "9600099887",
      vehicles: {
        create: {
          registrationNo: "TN70 AR 1234",
          type: "TAXI",
          make: "Toyota",
          model: "Etios",
          manufactureYear: 2021,
          insuranceProvider: "United India",
          insurancePolicyNo: "UII-2244",
          insuranceExpiry: subMonths(now, -1), // expiring soon
          fitnessExpiry: in6m,
          permitType: "Contract Carriage",
          permitExpiry: in6m,
        },
      },
    },
    include: { vehicles: true },
  });

  const c2 = await prisma.customer.create({
    data: {
      code: "CUS-000002",
      name: "Meena Transports",
      phone: "9600033344",
      address: "45 SIPCOT Phase 2",
      city: "Hosur",
      pincode: "635126",
      panNo: "AAGCM5678P",
      guarantorName: "Ravi Kumar",
      guarantorPhone: "9600055443",
      vehicles: {
        create: {
          registrationNo: "TN70 BG 5678",
          type: "GOODS_CARRIER",
          make: "Ashok Leyland",
          model: "Dost",
          manufactureYear: 2020,
          insuranceProvider: "New India",
          insuranceExpiry: in6m,
          fitnessExpiry: subMonths(now, -1), // expiring soon
          permitType: "National Permit",
          permitExpiry: in1m,
        },
      },
    },
    include: { vehicles: true },
  });

  const c3 = await prisma.customer.create({
    data: {
      code: "CUS-000003",
      name: "Perumal Earthmovers",
      phone: "9600077766",
      address: "Bagalur Road",
      city: "Hosur",
      pincode: "635103",
      guarantorName: "Kannan",
      guarantorPhone: "9600088990",
      vehicles: {
        create: {
          registrationNo: "TN70 CE 9012",
          type: "EARTHMOVER",
          make: "JCB",
          model: "3DX",
          manufactureYear: 2019,
          insuranceProvider: "ICICI Lombard",
          insuranceExpiry: in6m,
          fitnessExpiry: in6m,
        },
      },
    },
    include: { vehicles: true },
  });

  const c4 = await prisma.customer.create({
    data: {
      code: "CUS-000004",
      name: "Lakshmi Agri Services",
      phone: "9600044455",
      address: "Denkanikottai Road",
      city: "Hosur",
      pincode: "635107",
      vehicles: {
        create: {
          registrationNo: "TN70 DT 3456",
          type: "TRACTOR",
          make: "Mahindra",
          model: "575 DI",
          manufactureYear: 2022,
          insuranceProvider: "Bajaj Allianz",
          insuranceExpiry: in6m,
        },
      },
    },
    include: { vehicles: true },
  });

  console.log("Creating users…");
  await prisma.user.create({
    data: { email: "admin@hlffinance.in", name: "Head Office Admin", role: "ADMIN", passwordHash },
  });
  await prisma.user.create({
    data: { email: "staff@hlffinance.in", name: "Priya (Staff)", role: "STAFF", passwordHash },
  });
  await prisma.user.create({
    data: {
      email: "franchisee@hlffinance.in",
      name: "R. Murugan (Balaji HLF)",
      role: "FRANCHISEE",
      passwordHash,
      franchiseeId: balaji.id,
    },
  });
  await prisma.user.create({
    data: {
      email: "borrower@hlffinance.in",
      name: "Karthik Raja",
      role: "BORROWER",
      passwordHash,
      customerId: c1.id,
    },
  });

  // Helper: create a loan with schedule + disbursement ledger, then optionally
  // settle the first `paidCount` installments (with zero-overdue discount).
  async function createLoan(opts: {
    agreementNo: string;
    customerId: string;
    vehicleId: string;
    franchiseeId: string;
    franchiseeSharePct: number;
    baseAmount: number;
    insurance?: number;
    rate: number;
    method: InterestMethod;
    tenure: number;
    firstEmiDate: Date;
    zeroOverdueDiscountPct?: number;
    penaltyRatePctPerMonth?: number;
    paidCount?: number;
    receivedByEmail?: string;
  }) {
    const principal = round2(opts.baseAmount + (opts.insurance ?? 0));
    const schedule = buildSchedule({
      principal,
      annualRatePct: opts.rate,
      tenureMonths: opts.tenure,
      method: opts.method,
      firstEmiDate: opts.firstEmiDate,
    });
    const headOfficeSharePct = round2(100 - opts.franchiseeSharePct);
    const franchiseeAmount = round2((principal * opts.franchiseeSharePct) / 100);

    const loan = await prisma.loan.create({
      data: {
        agreementNo: opts.agreementNo,
        customerId: opts.customerId,
        vehicleId: opts.vehicleId,
        franchiseeId: opts.franchiseeId,
        principal,
        interestRate: opts.rate,
        interestMethod: opts.method,
        tenureMonths: opts.tenure,
        emiAmount: schedule.emiAmount,
        franchiseeSharePct: opts.franchiseeSharePct,
        headOfficeSharePct,
        penaltyRatePctPerMonth: opts.penaltyRatePctPerMonth ?? 2,
        zeroOverdueDiscountPct: opts.zeroOverdueDiscountPct ?? 2,
        status: "ACTIVE",
        firstEmiDate: opts.firstEmiDate,
        disbursedAt: subMonths(opts.firstEmiDate, 1),
        agreementDate: subMonths(opts.firstEmiDate, 1),
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
      include: { installments: { orderBy: { seqNo: "asc" } } },
    });

    if (opts.insurance && opts.insurance > 0) {
      await prisma.loanAddon.create({
        data: { loanId: loan.id, type: "INSURANCE", amount: opts.insurance, description: "Vehicle insurance" },
      });
    }

    await prisma.ledgerEntry.create({
      data: {
        franchiseeId: opts.franchiseeId,
        loanId: loan.id,
        direction: "DISBURSEMENT",
        franchiseeAmount,
        headOfficeAmount: round2(principal - franchiseeAmount),
        description: `Disbursement of ${opts.agreementNo}`,
        occurredOn: subMonths(opts.firstEmiDate, 1),
      },
    });

    const receiver = opts.receivedByEmail
      ? await prisma.user.findUnique({ where: { email: opts.receivedByEmail } })
      : null;

    let receiptSeq = 1;
    for (let k = 0; k < (opts.paidCount ?? 0); k++) {
      const inst = loan.installments[k];
      if (!inst) break;
      const discount = round2((Number(inst.interestDue) * (opts.zeroOverdueDiscountPct ?? 2)) / 100);
      const interestPaid = round2(Number(inst.interestDue) - discount);
      const principalPaid = Number(inst.principalDue);
      const amount = round2(interestPaid + principalPaid);
      const paidAt = inst.dueDate;

      await prisma.installment.update({
        where: { id: inst.id },
        data: {
          interestPaid,
          principalPaid,
          discountGiven: discount,
          status: "PAID",
          paidAt,
        },
      });

      const payment = await prisma.payment.create({
        data: {
          receiptNo: `${opts.agreementNo}-R${receiptSeq++}`,
          loanId: loan.id,
          amount,
          mode: "UPI",
          paidAt,
          receivedById: receiver?.id ?? null,
          allocations: {
            create: [
              { target: "INTEREST", amount: interestPaid, installmentId: inst.id },
              { target: "PRINCIPAL", amount: principalPaid, installmentId: inst.id },
            ],
          },
        },
      });

      const fShare = opts.franchiseeSharePct / 100;
      const fAmt = round2(amount * fShare);
      await prisma.ledgerEntry.create({
        data: {
          franchiseeId: opts.franchiseeId,
          loanId: loan.id,
          direction: "COLLECTION",
          franchiseeAmount: fAmt,
          headOfficeAmount: round2(amount - fAmt),
          description: `Collection ${payment.receiptNo}`,
          occurredOn: paidAt,
        },
      });
    }

    return loan;
  }

  console.log("Creating loans…");

  // Loan 1: brand new, first EMI next month — clean/current.
  await createLoan({
    agreementNo: "AGR-2026-000001",
    customerId: c1.id,
    vehicleId: c1.vehicles[0].id,
    franchiseeId: balaji.id,
    franchiseeSharePct: 80,
    baseAmount: 450000,
    insurance: 28000,
    rate: 13.5,
    method: "FLAT",
    tenure: 36,
    firstEmiDate: in1m,
    receivedByEmail: "staff@hlffinance.in",
  });

  // Loan 2: 4 months in, all 4 due EMIs paid on time — earning discounts, current.
  await createLoan({
    agreementNo: "AGR-2026-000002",
    customerId: c4.id,
    vehicleId: c4.vehicles[0].id,
    franchiseeId: anand.id,
    franchiseeSharePct: 75,
    baseAmount: 620000,
    rate: 12,
    method: "REDUCING",
    tenure: 48,
    firstEmiDate: subMonths(now, 4),
    paidCount: 4,
    receivedByEmail: "staff@hlffinance.in",
  });

  // Loan 3: 5 months in, only 2 EMIs paid — OVERDUE. Add penalty + towing charges.
  const overdueLoan = await createLoan({
    agreementNo: "AGR-2026-000003",
    customerId: c3.id,
    vehicleId: c3.vehicles[0].id,
    franchiseeId: balaji.id,
    franchiseeSharePct: 80,
    baseAmount: 900000,
    rate: 15,
    method: "FLAT",
    tenure: 24,
    firstEmiDate: subMonths(now, 5),
    paidCount: 2,
    receivedByEmail: "staff@hlffinance.in",
  });
  await prisma.charge.createMany({
    data: [
      {
        loanId: overdueLoan.id,
        type: "LATE_PENALTY",
        amount: 3600,
        description: "2%/mo on overdue EMIs",
        incurredOn: subMonths(now, 1),
      },
      {
        loanId: overdueLoan.id,
        type: "TOWING",
        amount: 4500,
        description: "Towing to yard",
        incurredOn: subMonths(now, 1),
      },
    ],
  });

  // Loan 4: 3 months in, 3 paid on time — current, goods carrier.
  await createLoan({
    agreementNo: "AGR-2026-000004",
    customerId: c2.id,
    vehicleId: c2.vehicles[0].id,
    franchiseeId: anand.id,
    franchiseeSharePct: 75,
    baseAmount: 380000,
    insurance: 22000,
    rate: 14,
    method: "FLAT",
    tenure: 30,
    firstEmiDate: subMonths(now, 3),
    paidCount: 3,
    receivedByEmail: "staff@hlffinance.in",
  });

  // Record one partial settlement to Anand HLF so the pay-out feature has data.
  const anandLedger = await prisma.ledgerEntry.findMany({
    where: { franchiseeId: anand.id, direction: "COLLECTION" },
  });
  const anandCollected = anandLedger.reduce((s, e) => s + Number(e.franchiseeAmount), 0);
  if (anandCollected > 0) {
    await prisma.settlement.create({
      data: {
        reference: "STL-2026-000001",
        franchiseeId: anand.id,
        amount: round2(anandCollected * 0.5), // settle half of what's collected for them
        method: "BANK_TRANSFER",
        note: "Interim settlement",
        settledOn: subMonths(now, 1),
      },
    });
  }

  console.log("\nSeed complete.");
  console.log("Demo logins (password: password123):");
  console.log("  admin@hlffinance.in       — Administrator");
  console.log("  staff@hlffinance.in       — Head-office staff");
  console.log("  franchisee@hlffinance.in  — Balaji HLF franchisee");
  console.log("  borrower@hlffinance.in    — Borrower (Karthik Raja)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
