# 🍩 Fat Boyz

A weight-loss challenge app for you and your crew. Everyone buys into a pot, logs their weigh-ins over the length of the challenge, and whoever wins by the agreed rule takes the money.

**Live app:** https://fat-boyz-one.vercel.app

It's a PWA — open it on your phone and "Add to Home Screen" and it runs like a real app (its own icon, full screen, push notifications).

## Features

- **Challenges** — set the buy-in, dates, weigh-in day, and how the winner is decided:
  % of body weight lost, most weight lost, first to a target, most consistent, or last one standing.
- **Join by code** — share a 6-character code; friends tap "Join with code."
- **Weigh-ins** — log your weight through a challenge, or use the global **Log** to record one weigh-in across every active challenge at once.
- **Live leaderboard** — activity-ring dials ranked by the challenge's winner rule, with a 👑 for the leader.
- **Goals** — your personal weight & BMI graph over time, with a goal line.
- **Profile** — height, goal weight, units (lb/kg), and automatic BMI.
- **Pot tracking** — see the pot, who's paid, and the payout. (The app tracks money; it never holds or moves it — settle up over Venmo/Cash App.)
- **Admin** — the host can mark payments, remove no-shows, edit/delete the challenge, and broadcast a message to everyone.
- **Push notifications** — weigh-in-day reminders and host messages.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (auth + Postgres + row-level security) · Web Push · deployed on Vercel.

## Running locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (also type-checks)
npm run lint
```

You'll need a `.env.local` — copy `.env.local.example` and fill in your keys. See **[SETUP.md](./SETUP.md)** for the full walkthrough (creating the Supabase project and running the database schema).

## Setup & deployment docs

- **[SETUP.md](./SETUP.md)** — create the Supabase project and database tables
- **[DEPLOY.md](./DEPLOY.md)** — deploy to Vercel
- **[PUSH.md](./PUSH.md)** — enable push notifications (VAPID keys, cron)
- **[CLAUDE.md](./CLAUDE.md)** — architecture notes for working on the code

## How it's structured

- `src/app/(app)/` — the signed-in app (dashboard, challenges, goals, log, account), all behind auth.
- `src/lib/` — the brains: Supabase clients, stats/leaderboard math, unit & BMI helpers, push.
- `supabase/*.sql` — the database schema and migrations (run by hand in the Supabase SQL editor).

More detail in [CLAUDE.md](./CLAUDE.md).
