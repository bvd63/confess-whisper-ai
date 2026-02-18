-- Prevent authenticated clients from self-approving moderation status.
begin;

drop policy if exists "confessions_insert_authenticated" on public.confessions;

create policy "confessions_insert_authenticated"
  on public.confessions
  for insert
  to authenticated
  with check (false);

commit;
