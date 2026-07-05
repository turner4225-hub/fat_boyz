-- Fat Boyz — database schema
-- Run this in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to re-run: it uses "if not exists" / "or replace" where possible.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ---------------------------------------------------------------------------
-- profiles: one row per user, mirrors auth.users
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'New Boy',
  avatar_url   text,
  unit         text not null default 'lb' check (unit in ('lb','kg')),
  height_cm    numeric(5,1),
  goal_weight  numeric(6,2),
  created_at   timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- challenges
-- ---------------------------------------------------------------------------
create table if not exists public.challenges (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  created_by    uuid not null references public.profiles (id) on delete cascade,
  buy_in_amount numeric(10,2) not null default 0,
  currency      text not null default 'USD',
  unit          text not null default 'lb'   check (unit in ('lb','kg')),
  start_date    date not null,
  end_date      date not null,
  weigh_in_day  int  not null default 0      check (weigh_in_day between 0 and 6),
  winner_rule   text not null default 'percent_lost'
                check (winner_rule in ('percent_lost','total_lost','first_to_target','most_consistent','last_standing')),
  target_type   text check (target_type in ('amount_lost','goal_weight')),
  target_amount numeric(10,2),
  photo_proof   text not null default 'optional' check (photo_proof in ('off','optional','required')),
  tie_breaker   text not null default 'split'    check (tie_breaker in ('split','earliest_best')),
  join_code     text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 6)),
  created_at    timestamptz not null default now(),
  check (end_date > start_date)
);

-- ---------------------------------------------------------------------------
-- challenge_members
-- ---------------------------------------------------------------------------
create table if not exists public.challenge_members (
  id              uuid primary key default gen_random_uuid(),
  challenge_id    uuid not null references public.challenges (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  role            text not null default 'member' check (role in ('admin','member')),
  has_paid        boolean not null default false,
  starting_weight numeric(6,2),
  joined_at       timestamptz not null default now(),
  unique (challenge_id, user_id)
);

-- ---------------------------------------------------------------------------
-- weigh_ins
-- ---------------------------------------------------------------------------
create table if not exists public.weigh_ins (
  id           uuid primary key default gen_random_uuid(),
  -- null challenge_id = a personal weigh-in not tied to any challenge.
  challenge_id uuid references public.challenges (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  weight       numeric(6,2) not null check (weight > 0),
  photo_url    text,
  weighed_on   date not null default current_date,
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists weigh_ins_challenge_idx on public.weigh_ins (challenge_id);
create index if not exists members_challenge_idx    on public.challenge_members (challenge_id);
create index if not exists members_user_idx         on public.challenge_members (user_id);

-- ---------------------------------------------------------------------------
-- Membership helper (SECURITY DEFINER avoids RLS recursion on the members
-- table: policies can call this without re-triggering member policies).
-- ---------------------------------------------------------------------------
create or replace function public.is_member(cid uuid, uid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.challenge_members m
    where m.challenge_id = cid and m.user_id = uid
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.challenges        enable row level security;
alter table public.challenge_members enable row level security;
alter table public.weigh_ins         enable row level security;

-- profiles: everyone signed in can read profiles (needed for leaderboards);
-- you can only edit your own.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- challenges: members can read; anyone signed in can create; only the creator
-- can edit/delete. (Looking up by join_code to join is handled by a SECURITY
-- DEFINER function so non-members can find the challenge they were invited to.)
drop policy if exists challenges_read on public.challenges;
create policy challenges_read on public.challenges
  for select to authenticated
  using (created_by = auth.uid() or public.is_member(id, auth.uid()));

drop policy if exists challenges_insert on public.challenges;
create policy challenges_insert on public.challenges
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists challenges_update_own on public.challenges;
create policy challenges_update_own on public.challenges
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists challenges_delete_own on public.challenges;
create policy challenges_delete_own on public.challenges
  for delete to authenticated using (created_by = auth.uid());

-- challenge_members: members of a challenge can see the roster; you manage your
-- own membership row (join/leave, set your starting weight). The challenge
-- creator can manage everyone (mark paid, remove no-shows).
drop policy if exists members_read on public.challenge_members;
create policy members_read on public.challenge_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_member(challenge_id, auth.uid())
    or exists (select 1 from public.challenges c where c.id = challenge_id and c.created_by = auth.uid())
  );

drop policy if exists members_insert_self on public.challenge_members;
create policy members_insert_self on public.challenge_members
  for insert to authenticated with check (user_id = auth.uid());

-- Only the host may update member rows (mark paid, etc.). Members never update
-- their own row in the app: joining is via join_challenge_by_code (definer) and
-- leaving is a delete. Host-only here closes the "mark myself paid" hole.
drop policy if exists members_update on public.challenge_members;
create policy members_update on public.challenge_members
  for update to authenticated
  using (
    exists (select 1 from public.challenges c where c.id = challenge_id and c.created_by = auth.uid())
  )
  with check (
    exists (select 1 from public.challenges c where c.id = challenge_id and c.created_by = auth.uid())
  );

drop policy if exists members_delete on public.challenge_members;
create policy members_delete on public.challenge_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.challenges c where c.id = challenge_id and c.created_by = auth.uid())
  );

-- weigh_ins: members of a challenge can see all its weigh-ins (weights are
-- public within the crew); you always see your own personal (null) rows. You
-- create/edit/delete your own; the host can log/remove rows in their challenge.
drop policy if exists weighins_read on public.weigh_ins;
create policy weighins_read on public.weigh_ins
  for select to authenticated
  using (
    (challenge_id is not null and public.is_member(challenge_id, auth.uid()))
    or (challenge_id is null and user_id = auth.uid())
  );

drop policy if exists weighins_insert_own on public.weigh_ins;
create policy weighins_insert_own on public.weigh_ins
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (challenge_id is null or public.is_member(challenge_id, auth.uid()))
  );

-- The challenge host may log a weigh-in for any member of their challenge.
drop policy if exists weighins_insert_by_host on public.weigh_ins;
create policy weighins_insert_by_host on public.weigh_ins
  for insert to authenticated
  with check (
    challenge_id is not null
    and exists (select 1 from public.challenges c where c.id = challenge_id and c.created_by = auth.uid())
  );

drop policy if exists weighins_update_own on public.weigh_ins;
create policy weighins_update_own on public.weigh_ins
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists weighins_delete_own on public.weigh_ins;
create policy weighins_delete_own on public.weigh_ins
  for delete to authenticated using (user_id = auth.uid());

-- The host may remove weigh-ins in their challenge (fix mistakes).
drop policy if exists weighins_delete_by_host on public.weigh_ins;
create policy weighins_delete_by_host on public.weigh_ins
  for delete to authenticated
  using (
    challenge_id is not null
    and exists (select 1 from public.challenges c where c.id = challenge_id and c.created_by = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- join_challenge_by_code: lets an invited user join without being able to read
-- every challenge. Runs as definer so it can look up the code, then inserts a
-- membership row for the caller.
-- ---------------------------------------------------------------------------
create or replace function public.join_challenge_by_code(code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  target public.challenges;
begin
  select * into target from public.challenges c where c.join_code = upper(code);
  if not found then
    raise exception 'No challenge found for that code';
  end if;

  insert into public.challenge_members (challenge_id, user_id)
  values (target.id, auth.uid())
  on conflict (challenge_id, user_id) do nothing;

  return target.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage: private bucket for scale-photo proof.
-- Path convention: "<user_id>/<filename>" → folder[1] is the owner.
-- Read is owner-only; cross-member proof viewing (a planned feature) will use
-- server-generated signed URLs for an authorized viewer.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('weigh-in-photos', 'weigh-in-photos', false)
on conflict (id) do nothing;

drop policy if exists "weigh photos insert own" on storage.objects;
create policy "weigh photos insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'weigh-in-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "weigh photos read" on storage.objects;
create policy "weigh photos read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'weigh-in-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "weigh photos delete own" on storage.objects;
create policy "weigh photos delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'weigh-in-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
