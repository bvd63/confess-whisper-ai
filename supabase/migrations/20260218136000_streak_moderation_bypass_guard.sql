-- Block user-controlled streak mutations and remove badge-based auto-approval.
begin;

alter table if exists public.user_streaks enable row level security;
alter table if exists public.user_streaks force row level security;

drop policy if exists "Users can update their streak" on public.user_streaks;
drop policy if exists "Users can insert their streak" on public.user_streaks;
drop policy if exists "Users can view their streak" on public.user_streaks;
drop policy if exists "user_streaks_service_role_write" on public.user_streaks;

create policy "Users can view their streak"
  on public.user_streaks
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_streaks_service_role_write"
  on public.user_streaks
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.auto_moderate_confession()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Badge ownership must never auto-approve moderation.
  return new;
end;
$$;

commit;
