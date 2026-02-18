-- M4: Add missing Stripe subscription metadata fields used by lifecycle webhook updates
alter table public.profiles
  add column if not exists subscription_price_id text,
  add column if not exists subscription_interval text;

-- Enforce normalized interval values while allowing nulls
alter table public.profiles
  drop constraint if exists profiles_subscription_interval_check;

alter table public.profiles
  add constraint profiles_subscription_interval_check
  check (subscription_interval is null or subscription_interval in ('monthly', 'yearly'));

create index if not exists idx_profiles_subscription_price_id
  on public.profiles(subscription_price_id);
