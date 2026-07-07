# Deploying HLF Finance (and using it on your phone)

HLF Finance is a **web app**, not an App Store app. Once it's hosted at a public
URL, you open that URL in **Safari** on your iPhone (or Chrome on Android) and,
because it's a Progressive Web App, you can **Add it to your Home Screen** — it
then gets its own icon and opens full-screen like a native app.

You need two things online: a **PostgreSQL database** and the **Next.js app**.
The steps below use Neon (database) + Vercel (app), both of which have free tiers
and work well together. Total time: ~15 minutes.

---

## 1. Create the database (Neon)

1. Sign up at <https://neon.tech> and create a project (pick a region close to
   Hosur, e.g. Mumbai/Singapore).
2. Copy the **connection string** it gives you. It looks like:
   ```
   postgresql://USER:PASSWORD@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
   Keep this handy — it's your `DATABASE_URL`.

> Any hosted Postgres works (Supabase, Railway, RDS…). Just get its connection
> string.

## 2. Deploy the app (Vercel)

1. Push this repository to GitHub (the branch is already there).
2. Sign in at <https://vercel.com> with GitHub and click **Add New → Project**,
   then import this repository.
3. Before deploying, open **Environment Variables** and add:

   | Name          | Value                                                        |
   | ------------- | ------------------------------------------------------------ |
   | `DATABASE_URL`| the Neon connection string from step 1                       |
   | `AUTH_SECRET` | a random secret — generate with `openssl rand -hex 32`       |

4. Click **Deploy**. Vercel runs the build (`prisma generate && next build`).
   When it finishes you'll get a URL like `https://hlf-finance.vercel.app`.

## 3. Set up the database schema and demo data (one time)

Run these **once**, from your computer, pointing at the Neon database. In a
terminal in this project folder:

```bash
# Put the SAME Neon URL in a local .env (see .env.example)
echo 'DATABASE_URL="postgresql://...neon...?sslmode=require"' > .env
echo 'AUTH_SECRET="anything-here-for-local-cli-use"' >> .env

npm install
npx prisma migrate deploy   # creates all the tables
npm run db:seed             # loads demo franchisees, customers, loans
```

> `migrate deploy` applies the committed migrations without prompting — safe for
> production. Re-running the seed **wipes and reloads demo data**, so only seed
> once (or skip it entirely and enter your real data through the app).

## 4. Open it on your iPhone

1. In **Safari**, go to your Vercel URL and sign in.
   Demo login: `staff@hlffinance.in` / `password123`.
2. Tap the **Share** icon → **Add to Home Screen** → **Add**.
3. You'll now have an **HLF Finance** icon on your home screen that opens
   full-screen, no address bar.

Android: open the URL in Chrome → menu → **Install app / Add to Home screen**.

---

## Before real customer data goes in

This is an evaluation build. For production use with real borrowers, plan for:

- **Replace demo accounts** — delete the seeded users and create real staff
  logins with strong passwords. Change `AUTH_SECRET`.
- **Backups** — enable automated backups on the database (Neon has
  point-in-time restore).
- **Access hardening** — password reset flow, optional 2FA, session limits, and
  an audit trail of who recorded each payment/charge (the schema already stamps
  `receivedBy` on payments).
- **A security review** before go-live.

## Updating the app later

Every push to the branch/`master` triggers a fresh Vercel deploy automatically.
If a change adds new Prisma migrations, run `npx prisma migrate deploy` against
the production database as part of the release.

## Environment variables reference

| Variable       | Required | Purpose                                             |
| -------------- | -------- | --------------------------------------------------- |
| `DATABASE_URL` | yes      | PostgreSQL connection string                        |
| `AUTH_SECRET`  | yes      | Signs the session cookie; keep secret, rotate ≠ dev |
