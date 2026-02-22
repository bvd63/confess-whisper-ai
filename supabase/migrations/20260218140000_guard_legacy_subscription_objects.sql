-- Guard migration: ensure legacy subscription->profile sync objects stay disabled
-- and authenticated users cannot write to subscriptions.
begin;

alter table if exists public.subscriptions enable row level security;
alter table if exists public.subscriptions force row level security;

-- Remove legacy entitlement sync path if present.
drop trigger if exists sync_subscription_to_profile_trigger on public.subscriptions;
drop function if exists public.sync_subscription_to_profile();

-- Remove legacy authenticated write policies if present.
drop policy if exists "subscriptions_insert_self" on public.subscriptions;
drop policy if exists "subscriptions_update_self" on public.subscriptions;
drop policy if exists "subscriptions_delete_self" on public.subscriptions;

-- Re-affirm hardened service-role-only write policy.
drop policy if exists "Service role can manage subscriptions" on public.subscriptions;
create policy "Service role can manage subscriptions" on public.subscriptions
  for all
  to service_role
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

commit;
