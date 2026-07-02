-- Fat Boyz — migration 002: profile height, goal weight, unit preference
-- Run this in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to re-run (uses "if not exists").

alter table public.profiles
  add column if not exists unit        text          not null default 'lb'
    check (unit in ('lb','kg')),
  add column if not exists height_cm   numeric(5,1),
  add column if not exists goal_weight numeric(6,2);
