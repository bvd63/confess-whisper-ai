-- Lock down subscriptions table writes to service_role only and remove legacy entitlement sync trigger.
begin;

alter table if exists public.subscriptions enable row level security;
alter table if exists public.subscriptions force row level security;
revoke all on table public.subscriptions from public, anon;

-- Keep owner read access.
drop policy if exists "subscriptions_select_self" on public.subscriptions;
create policy "subscriptions_select_self" on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Remove authenticated write access to subscriptions.
drop policy if exists "subscriptions_insert_self" on public.subscriptions;
drop policy if exists "subscriptions_update_self" on public.subscriptions;
drop policy if exists "subscriptions_delete_self" on public.subscriptions;

-- Service role remains the only writer (webhook/server reconciliation paths).
drop policy if exists "Service role can manage subscriptions" on public.subscriptions;
create policy "Service role can manage subscriptions" on public.subscriptions
  for all
  to service_role
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Remove legacy trigger path that could sync mutable subscriptions rows into profile entitlements.
drop trigger if exists sync_subscription_to_profile_trigger on public.subscriptions;
drop function if exists public.sync_subscription_to_profile();

commit;
