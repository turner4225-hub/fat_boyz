# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Fat Boyz — a weight-loss challenge PWA for a group of friends running cash-pot challenges (everyone buys in, winner takes the pot). Live at https://fat-boyz-one.vercel.app. The owner is non-technical; explain changes in plain language and verify work in the browser rather than asking them to test.

## Commands

```bash
npm run dev      # dev server (Turbopack). Do NOT hardcode a port; PORT env is respected
npm run build    # production build — type-checks + builds
npm run lint     # eslint
npm run test     # vitest, watch mode
npm run test:run # vitest, single run (use this in CI / verification)
```

Verification workflow: `npm run test:run` (unit) + `npm run build` (type-check + build), then
drive the app in a browser for anything user-facing. Unit tests (Vitest) live in
`src/lib/__tests__/` and cover the pure logic — stats, leaderboard/winner-rules, health/BMI
conversions, personal timeline, date formatting. **When you change money-critical math (winner
rules, stats, conversions), add or update a test** so a future change can't silently break it.

## Stack & versions

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 (CSS-first config) · Supabase (auth + Postgres + RLS) · Vercel (auto-deploys `main`).

Next 16 breaking changes that already bit this repo — per AGENTS.md, check `node_modules/next/dist/docs/` before using an API you haven't used here:
- `middleware.ts` is now `src/proxy.ts` (exports `proxy()`); Supabase session refresh lives there.
- `cookies()` is async — `src/lib/supabase/server.ts#createClient` is therefore async too.

## Architecture

### Three Supabase clients — pick the right one
- `src/lib/supabase/client.ts` — browser (Client Components).
- `src/lib/supabase/server.ts` — Server Components / Server Actions / route handlers (cookie-based, respects RLS). **Default choice.**
- `src/lib/supabase/admin.ts` — service-role, bypasses RLS, `server-only`. Only for push sending and the cron job. Never import into anything reachable from the client.

### Auth & authorization
- Email/password only (email confirmation intentionally OFF in Supabase; Google auth deliberately skipped).
- `src/lib/auth.ts` is the DAL: `getUser()` / `requireUser()` / `getProfile()`, all `react.cache`d per request.
- Every signed-in page lives in the `src/app/(app)/` route group whose layout calls `requireUser()` and renders the header + bottom tab bar (Home / Goals / Log / You).
- **RLS is the real security boundary.** Server Actions check ownership as UX, but policies in `supabase/*.sql` are what enforce it. The `is_member()` SQL function is `SECURITY DEFINER` specifically to avoid RLS recursion on `challenge_members` — keep that pattern if adding policies. Joining by invite code goes through the `join_challenge_by_code` RPC (also definer) so non-members can't read challenges.

### Database schema changes
No migration tooling. Schema lives in `supabase/*.sql` (numbered files = later migrations), which the owner pastes into the Supabase dashboard SQL editor by hand. When changing schema: write an idempotent migration file (`if not exists` / `or replace`), fold it into `schema.sql` for fresh installs, update `src/lib/types.ts` to match, and tell the owner to run it. One shared database serves local dev and production.

### Domain model (the part that isn't obvious from one file)
- `challenges` → `challenge_members` → `weigh_ins`, plus `profiles` (auto-created by DB trigger on signup) and `push_subscriptions`.
- A member's stats (start weight, current, % lost) are **derived from their weigh-ins** (`src/lib/stats.ts`) — earliest weigh-in is the baseline; there is no authoritative starting-weight column in use.
- Leaderboard ranking (`src/lib/leaderboard.ts`) is computed per challenge from its `winner_rule` (percent_lost / total_lost / first_to_target / most_consistent / last_standing).
- A user's *personal* weight timeline (Goals page, BMI) is the aggregate of their own weigh-ins across **all** challenges, deduped by date and unit-converted (`src/lib/personal.ts`). The global Log page (`(app)/log/`) writes one weigh-in into every active challenge the user is in. Consequence: you can't log weight with zero active challenges.
- Unit conversions and BMI live in `src/lib/health.ts`; challenges and profiles each carry their own `lb`/`kg` unit.

### Conventions
- **Mutations are Server Actions** in a colocated `actions.ts` (`"use server"`), consumed by client form components via `useActionState`, returning `{ error?: string, ok?: boolean }` state and calling `revalidatePath`. Follow this shape for new features.
- **Dates are plain `YYYY-MM-DD` strings** compared lexically. Always derive "today" with `new Date().toLocaleDateString("en-CA")` and format for display with `formatDate()` in `src/lib/format.ts`. Never use `toISOString().slice(0,10)` or `new Date("YYYY-MM-DD")` directly — both caused UTC off-by-one bugs that were fixed.
- Theme is CSS variables in `src/app/globals.css` exposed as Tailwind tokens (`bg-card`, `text-muted`, `text-brand`, `text-gold`, `ring1/2/3` colors). Use tokens, not raw hex, so the activity-rings theme stays consistent.
- PWA: manifest from `src/app/manifest.ts`, icons in `public/`, service worker `public/sw.js` (Web Push). Push sending is in `src/lib/push.ts`; the daily reminder cron (`vercel.json`, 16:00 UTC) hits `/api/cron/weigh-in-reminders`, which requires the `Bearer CRON_SECRET` header.

### Environment
Secrets live in `.env.local` (git-ignored; see `.env.local.example` for the full list) **and must be mirrored in Vercel project env vars** — a feature that works locally but not in prod usually means a var missing on Vercel. `NEXT_PUBLIC_SUPABASE_URL` is the bare project URL (no `/rest/v1/` suffix).

### Human-facing docs
`SETUP.md` (Supabase bootstrap), `DEPLOY.md` (Vercel), `PUSH.md` (push notification setup) are written for the non-technical owner — keep them updated when setup steps change.
