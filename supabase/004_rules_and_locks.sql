-- Fat Boyz — migration 004
--   1. Lock down member updates to the host (fixes: a member could mark
--      themselves "paid" via the members_update policy).
--   2. Restrict scale-photo reads to the photo's owner (was: any signed-in
--      user could read every member's proof photo).
-- Run in Supabase SQL Editor (safe to re-run).

-- ---------------------------------------------------------------------------
-- 1: challenge_members — only the challenge host may UPDATE a member row.
-- The app never has a member update their own row: joining goes through the
-- SECURITY DEFINER join_challenge_by_code RPC, and leaving is a DELETE
-- (members_delete still lets you remove your own membership).
-- ---------------------------------------------------------------------------
drop policy if exists members_update on public.challenge_members;
create policy members_update on public.challenge_members
  for update to authenticated
  using (
    exists (
      select 1 from public.challenges c
      where c.id = challenge_id and c.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.challenges c
      where c.id = challenge_id and c.created_by = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 2: storage — a member may read only their OWN weigh-in photos.
-- (Cross-member proof viewing is a planned feature; it will use signed URLs
-- generated server-side for an authorized viewer rather than a blanket read.)
-- ---------------------------------------------------------------------------
drop policy if exists "weigh photos read" on storage.objects;
create policy "weigh photos read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'weigh-in-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
