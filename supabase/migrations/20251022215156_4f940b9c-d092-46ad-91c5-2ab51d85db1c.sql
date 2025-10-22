-- 1) Minimal tables (idempotent)
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text unique,
  status text not null,
  tier text not null,
  cadence text not null,
  price_id text not null,
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  pending_change jsonb
);

create table if not exists public.stripe_events (
  id text primary key,
  created_at timestamptz default now()
);
