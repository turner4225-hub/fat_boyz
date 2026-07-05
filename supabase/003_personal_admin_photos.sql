-- Fat Boyz — migration 003
--   1. Personal weigh-ins (challenge_id nullable)
--   2. Challenge host can log/remove weigh-ins for other members
--   3. Scale-photo proof stored in a private Storage bucket
-- Run in Supabase SQL Editor (safe to re-run).

-- ---------------------------------------------------------------------------
-- 1 + 2: weigh_ins — allow personal (null challenge) rows + host access
-- ---------------------------------------------------------------------------
alter table public.weigh_ins alter column challenge_id drop not null;

-- Read: challenge members see the challenge's weigh-ins; you always see your own
-- personal (null-challenge) ones.
drop policy if exists weighins_read on public.weigh_ins;
create policy weighins_read on public.weigh_ins
  for select to authenticated
  using (
    (challenge_id is not null and public.is_member(challenge_id, auth.uid()))
    or (challenge_id is null and user_id = auth.uid())
  );

-- Insert your own weigh-in, either personal (null) or into a challenge you're in.
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
    and exists (
      select 1 from public.challenges c
      where c.id = challenge_id and c.created_by = auth.uid()
    )
  );

-- The host may also remove weigh-ins in their challenge (fix mistakes).
drop policy if exists weighins_delete_by_host on public.weigh_ins;
create policy weighins_delete_by_host on public.weigh_ins
  for delete to authenticated
  using (
    challenge_id is not null
    and exists (
      select 1 from public.challenges c
      where c.id = challenge_id and c.created_by = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 3: Storage bucket for scale photos (private) + object policies
-- Path convention: "<user_id>/<filename>"  → folder[1] is the owner.
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
  using (bucket_id = 'weigh-in-photos');

drop policy if exists "weigh photos delete own" on storage.objects;
create policy "weigh photos delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'weigh-in-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
