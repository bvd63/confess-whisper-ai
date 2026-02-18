-- Secure public access to sensitive tables
begin;

-- rate_limits: lock down completely (service role only via RLS bypass)
alter table if exists public.rate_limits enable row level security;
alter table if exists public.rate_limits force row level security;

-- remove any lingering privileges for anon/auth
revoke all on table public.rate_limits from anon, authenticated;

-- drop legacy policies if present
drop policy if exists "rate_limits anon access" on public.rate_limits;
drop policy if exists "rate_limits auth access" on public.rate_limits;
drop policy if exists "Allow rate limits read" on public.rate_limits;
drop policy if exists "Allow rate limits write" on public.rate_limits;

-- profiles: enforce owner-only access to sensitive columns
alter table if exists public.profiles enable row level security;
alter table if exists public.profiles force row level security;

-- clean up potential legacy policies
drop policy if exists "Profiles select own" on public.profiles;
drop policy if exists "Profiles insert own" on public.profiles;
drop policy if exists "Profiles update own" on public.profiles;
drop policy if exists "Public read profiles" on public.profiles;
drop policy if exists "Anon read profiles" on public.profiles;
drop policy if exists "Auth read profiles" on public.profiles;

-- owner-scoped policies
create policy "Profiles select own" on public.profiles
  for select
  using (auth.uid() = user_id);

create policy "Profiles insert own" on public.profiles
  for insert
  with check (auth.uid() = user_id);

create policy "Profiles update own" on public.profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- security definer function + view exposing only non-sensitive fields
create or replace function public.get_profiles_public()
returns table (
  user_id uuid,
  nickname text,
  avatar_url text,
  bio text,
  handle text,
  is_nickname_public boolean,
  nickname_visibility public.nickname_visibility_enum,
  level integer,
  total_points integer,
  total_referrals integer,
  followers_count integer,
  following_count integer,
  posts_count integer,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    user_id,
    nickname,
    avatar_url,
    bio,
    handle,
    coalesce(is_nickname_public, true) as is_nickname_public,
    nickname_visibility,
    level,
    total_points,
    total_referrals,
    followers_count,
    following_count,
    posts_count,
    created_at
  from public.profiles;
$$;

grant execute on function public.get_profiles_public to anon, authenticated;

drop view if exists public.profiles_public;
create or replace view public.profiles_public as
  select * from public.get_profiles_public();

grant select on public.profiles_public to anon, authenticated;

commit;
