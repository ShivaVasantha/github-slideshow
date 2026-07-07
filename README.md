# HLF Finance — Vehicle Loan Management

Cloud loan-management platform for a vehicle financing business in **Hosur, Tamil Nadu**
that lends against vehicles through an **HLF franchise co-lending model**.

> **Milestone 1 — Loan core.** Customers, vehicles, loan agreements, co-lending
> shares, EMI schedules, payments, penalties/charges and the zero-overdue
> discount.
>
> **Milestone 2 — Compliance, settlements & portals.** Vehicle compliance
> renewals and a fleet-wide expiry alerts page, franchisee statements and
> co-lending settlement position, and a tailored borrower home.

## What it does today

- **Roles & access** — Admin and head-office staff run everything. HLF
  franchisees see only their own portfolio and co-lending position. Borrowers see
  only their own loans. Data scoping is enforced on every query.
- **Customers** — KYC (Aadhaar/PAN), guarantor details, and their vehicles.
- **Vehicles** — taxi, transport, personal, goods carrier, tractor, earthmover,
  bulldozer and more, with insurance / fitness / permit expiry tracking and
  colour-coded expiry warnings. Each vehicle has a detail page where staff
  **renew/update** any document, and a fleet-wide **Compliance** page buckets
  everything that is expired or expiring within 45 days.
- **Loan agreements** — flat or reducing-balance interest, configurable tenure,
  processing fee, penalty rate and zero-overdue discount. Value-add services
  (e.g. vehicle insurance) can be financed into the loan. The EMI schedule is
  generated automatically on creation.
- **Co-lending** — each loan records the franchisee vs head-office share. A
  ledger captures disbursements and collections split between the two co-lenders.
  Each franchisee has a **statement** page showing their portfolio, a running
  co-lending ledger, and a settlement position (capital deployed vs collected,
  per co-lender). Franchisee-role users see only their own statement.
- **Payments** — a receipt is recorded and applied through a waterfall
  (charges → interest → principal, oldest first). A **zero-overdue discount** is
  granted automatically when the account is current. Loans auto-close when fully
  paid.
- **Charges** — late-payment penalties (auto-computed from the overdue amount and
  days past due), overdue interest, towing, collection effort, legal expenses,
  cheque bounce, and other charges. Charges can be waived before they are paid.
- **Dashboard** — active loans, disbursed, outstanding, overdue, collections this
  month, upcoming compliance expiries, and a ranked overdue list. Borrowers get a
  **tailored home** showing each of their loans, the next EMI due, outstanding,
  overdue, on-time discounts earned, and recent receipts.

## Mobile & install

The UI is responsive — on a phone the sidebar becomes a top bar with a slide-in
menu. It's also a **Progressive Web App**: open the hosted URL in Safari/Chrome
and **Add to Home Screen** to get an app icon that launches full-screen. See
[`DEPLOY.md`](./DEPLOY.md) for hosting it and installing it on your iPhone.

## Tech stack

- **Next.js 15** (App Router, React 19, TypeScript) with Server Actions
- **PostgreSQL** via **Prisma**
- **Tailwind CSS**
- Session auth with `jose` (JWT in an httpOnly cookie) + `bcryptjs`

## Getting started

Requirements: Node 20+ and a PostgreSQL database.

```bash
# 1. Install dependencies
npm install

# 2. Configure the environment
cp .env.example .env
#   set DATABASE_URL and AUTH_SECRET (openssl rand -hex 32)

# 3. Create the schema and seed demo data
npx prisma migrate deploy   # or: npx prisma migrate dev
npm run db:seed

# 4. Run
npm run dev                 # http://localhost:3000
```

To host it (and add it to your iPhone home screen), follow
[`DEPLOY.md`](./DEPLOY.md).

### Demo logins (seed data)

Password for all accounts: `password123`

| Email                      | Role         | Sees                            |
| -------------------------- | ------------ | ------------------------------- |
| `admin@hlffinance.in`      | Administrator| Everything                      |
| `staff@hlffinance.in`      | Head-office  | Everything, day-to-day ops      |
| `franchisee@hlffinance.in` | HLF partner  | Only Sri Balaji HLF's portfolio |
| `borrower@hlffinance.in`   | Borrower     | Only their own loans            |

## Project layout

```
prisma/
  schema.prisma        # data model (loan core + compliance + ledger)
  seed.ts              # demo franchisees, customers, vehicles, loans, payments
src/
  lib/
    domain/            # pure business logic (unit-testable)
      schedule.ts      #   EMI + amortisation schedule (flat / reducing)
      allocation.ts    #   payment waterfall + zero-overdue discount
      outstanding.ts   #   live position, overdue, penalty calculation
      compliance.ts    #   insurance/fitness/permit expiry status
    actions/           # server actions (loans, payments, charges, customers…)
    auth/              # session, guards, role scoping
    money.ts           # rupee rounding + INR formatting
  components/          # shared UI
  app/
    login/             # sign in
    (app)/             # authenticated shell + pages
      dashboard/ loans/ customers/ vehicles/ compliance/ franchisees/
```

## Business rules worth knowing

- **Interest methods.** *Flat* charges interest on the original principal across
  the full tenure (common in this market); *reducing* amortises on the
  outstanding balance. The final installment absorbs rounding residue so totals
  reconcile to the paise.
- **Payment waterfall.** Charges first (oldest first), then installment interest,
  then principal — oldest installment first.
- **Zero-overdue discount.** When the borrower is fully current (no past-due
  installment, no outstanding charge) and a payment fully settles an on-time
  installment, the configured discount is applied on that installment's interest.
- **Late penalty.** `penalty rate %/month × overdue amount × (days past due / 30)`,
  posted as a `LATE_PENALTY` charge.

## Roadmap (next milestones)

- Automated expiry reminders (email/SMS) off the compliance data
- Recorded franchisee settlement runs (pay-outs) against the ledger
- Borrower self-service online EMI payments and downloadable receipts
- Reports & exports (portfolio, collections, ageing)

---

<sub>The repository's earlier Jekyll “GitHub slideshow” demo files remain in the
history and root for reference; they are unrelated to this application.</sub>
