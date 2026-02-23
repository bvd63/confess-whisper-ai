-- Legacy migration safety guards for hardened security-critical objects.
-- Ensures legacy/older migration order cannot reintroduce weaker definitions.

begin;

-- ---------------------------------------------------------------------------
-- rate_limits hardening guards
-- ---------------------------------------------------------------------------

create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limits_reset_at on public.rate_limits(reset_at);

alter table public.rate_limits enable row level security;
alter table public.rate_limits force row level security;

revoke all on table public.rate_limits from public;
revoke all on table public.rate_limits from anon;
revoke all on table public.rate_limits from authenticated;

drop policy if exists "rate_limits anon access" on public.rate_limits;
drop policy if exists "rate_limits auth access" on public.rate_limits;
drop policy if exists "Allow rate limits read" on public.rate_limits;
drop policy if exists "Allow rate limits write" on public.rate_limits;
drop policy if exists "Service role can manage rate limits" on public.rate_limits;

create policy "Service role can manage rate limits"
  on public.rate_limits
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on table public.rate_limits to service_role;
  end if;
end $$;

create or replace function public.cleanup_expired_rate_limits()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.rate_limits where reset_at < now();
end;
$$;

do $$
begin
  if to_regprocedure('public.cleanup_expired_rate_limits()') is not null then
    revoke all on function public.cleanup_expired_rate_limits() from public, anon, authenticated;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      grant execute on function public.cleanup_expired_rate_limits() to service_role;
    end if;
  end if;
end $$;

do $$
begin
  if to_regprocedure('public.increment_rate_limit_counter(text,integer)') is not null then
    revoke all on function public.increment_rate_limit_counter(text, integer) from public, anon, authenticated;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      grant execute on function public.increment_rate_limit_counter(text, integer) to service_role;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- stripe_webhook_events hardening guards
-- ---------------------------------------------------------------------------

create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,
  created_at timestamptz not null default now()
);

alter table public.stripe_webhook_events
  add column if not exists stripe_event_id text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'stripe_webhook_events'
      and column_name = 'event_id'
  ) then
    update public.stripe_webhook_events
    set stripe_event_id = event_id
    where stripe_event_id is null
      and event_id is not null;
  end if;
end $$;

update public.stripe_webhook_events
set stripe_event_id = 'legacy-' || md5(clock_timestamp()::text || ctid::text)
where stripe_event_id is null;

alter table public.stripe_webhook_events
  alter column stripe_event_id set not null;

alter table public.stripe_webhook_events
  add column if not exists created_at timestamptz default now();

alter table public.stripe_webhook_events
  alter column created_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'stripe_webhook_events_stripe_event_id_key'
      and conrelid = 'public.stripe_webhook_events'::regclass
  ) then
    alter table public.stripe_webhook_events
      add constraint stripe_webhook_events_stripe_event_id_key unique (stripe_event_id);
  end if;
end $$;

alter table public.stripe_webhook_events enable row level security;
alter table public.stripe_webhook_events force row level security;

do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stripe_webhook_events'
  loop
    execute format('drop policy if exists %I on public.stripe_webhook_events', p.policyname);
  end loop;
end $$;

create policy "Service role can manage stripe_webhook_events"
  on public.stripe_webhook_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

revoke all on table public.stripe_webhook_events from public;
revoke all on table public.stripe_webhook_events from anon;
revoke all on table public.stripe_webhook_events from authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on table public.stripe_webhook_events to service_role;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Trial lifecycle function permission guards
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regprocedure('public.activate_trial(uuid)') is not null then
    revoke all on function public.activate_trial(uuid) from public, anon, authenticated;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      grant execute on function public.activate_trial(uuid) to service_role;
    end if;
  end if;

  if to_regprocedure('public.check_trial_expiry(uuid)') is not null then
    revoke all on function public.check_trial_expiry(uuid) from public, anon, authenticated;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      grant execute on function public.check_trial_expiry(uuid) to service_role;
    end if;
  end if;

  if to_regprocedure('public.revoke_trial_purchases(uuid)') is not null then
    revoke all on function public.revoke_trial_purchases(uuid) from public, anon, authenticated;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      grant execute on function public.revoke_trial_purchases(uuid) to service_role;
    end if;
  end if;
end $$;

commit;
