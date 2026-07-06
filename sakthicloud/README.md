# SakthiCloud — Production Frontend (SaaS rebuild)

The scalable rebuild of the SakthiCloud frontend, following
`docs/PRODUCTION-ARCHITECTURE.md`. It replaces the single-file, Babel-in-browser
prototype with a bundled, code-split, API-backed SPA built for thousands of
subscriber hotels.

This is **Phase 0 (production-grade shell) + the first API-backed vertical slice
(Rooms)** — the foundation every other module repeats.

## What's here

```
sakthicloud/
├─ apps/
│  └─ web/                     Vite + React + TS SPA (the hotel-facing app)
│     └─ src/
│        ├─ app/               providers, router (code-split, entitlement-gated),
│        │                     auth context, and the shell (sidebar + topbar)
│        ├─ lib/               api-client (auth + 401 refresh), query-client,
│        │                     ws (per-tenant live channel), theme (CSS variables)
│        ├─ components/        UpgradeGate, Toast
│        └─ features/
│           └─ front-desk/rooms/   the reference slice: api → hooks → page → card
└─ packages/
   └─ shared/                  the web↔api contract (Zod schemas, entitlements,
                               nav, roles) — one definition, both sides
```

## Why this scales (vs. the prototype)

| Prototype | This rebuild |
|---|---|
| Babel-in-browser, one 700 KB HTML file | Vite build — bundled, minified, **code-split per module** (a Core tenant never downloads the Finance/Spa chunk) |
| Module state in `useState`, lost on refresh | **TanStack Query** server state + optimistic updates — persists, and shared across devices/receptionists |
| No live sync | Per-tenant **WebSocket** channel invalidates queries (live room board, KDS) |
| Inline-style theme objects | Per-tenant **CSS-variable** theming (`applyTheme`) |
| Entitlement gating in the HTML only | Shared entitlement map (`@sakthicloud/shared`), identical to backend `config/entitlements.js`; locked-but-visible `UpgradeGate` |
| Hand-rolled brace/regex checks | **TypeScript + Zod** validated at the trust boundary; `tsc` in the build |

## The six-part migration pattern

Every module is the same recipe, proven by `features/front-desk/rooms/`:

**Prisma model → Zod schema (`packages/shared`) → Fastify route → TanStack Query
hook → component → WebSocket live sync.**

`RoomsPage` reads `useRooms(propertyId)` (was `useState`), mutates through
`useUpdateRoom` (optimistic, rolls back on error), and refetches on the
`room:updated` WS event. Copy this folder per module to migrate the rest.

## Run it

```bash
pnpm install
pnpm --filter @sakthicloud/web build     # typecheck + production build
pnpm --filter @sakthicloud/web dev        # dev server on :5173
```

The app talks to the existing Fastify backend. Set the API base in
`apps/web/.env` (copy `.env.example`); in dev, the Vite proxy forwards `/api`
to `VITE_API_PROXY` (default `http://localhost:3001`). Log in with a seeded
account (see the backend's Implementation Guide) to load live data.

## Status / next

- **Done — shell:** toolchain, login + auth (real `/auth/login` + 401 refresh),
  section nav for all 32 modules, entitlement gating, CSS-variable theming, WS client.
- **Done — Phase 1 money data (front desk):**
  - **Rooms** — live board, optimistic housekeeping updates, WS refresh.
  - **Bookings** — list with status filters, check-in modal (real
    `/bookings/checkin`), check-out (real `/bookings/:id/checkout`); both
    invalidate the rooms cache so the board stays truthful.
  - **Folio** — running bill per in-house guest derived from real booking data;
    incidental lines are session-local until `folio_line`/`folio_payment` land
    (schema already defined in `packages/shared`).
- **Next (per the phased plan):** Housekeeping (work orders), then F&B → Kitchen
  (KDS) with real-time — each a repeat of the Rooms/Bookings slice.
- **Backend:** carries forward unchanged; migrate `apps/api` (JS→TS) in place and
  add the folio tables. The prototype's caveats hold until each module's tables
  land (see `backend/MIGRATION-NOTES.md`).
