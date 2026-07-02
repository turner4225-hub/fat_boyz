-- Fat Boyz — Web Push subscriptions & notification prefs
-- Run in Supabase SQL Editor after schema.sql (safe to re-run).

-- ---------------------------------------------------------------------------
-- Notification preferences on profiles
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists push_enabled boolean not null default true;

alter table public.profiles
  add column if not exists weigh_in_reminders boolean not null default true;

-- ---------------------------------------------------------------------------
-- push_subscriptions: one row per device/browser endpoint
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.push_subscriptions enable row level security;

drop policy if exists push_subs_select_own on public.push_subscriptions;
create policy push_subs_select_own on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists push_subs_insert_own on public.push_subscriptions;
create policy push_subs_insert_own on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists push_subs_update_own on public.push_subscriptions;
create policy push_subs_update_own on public.push_subscriptions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists push_subs_delete_own on public.push_subscriptions;
create policy push_subs_delete_own on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- Allow users to toggle their own notification prefs (profiles_update_own already exists).
