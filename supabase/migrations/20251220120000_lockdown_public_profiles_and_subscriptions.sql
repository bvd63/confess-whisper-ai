-- Strengthen profile/subscription RLS and introduce authenticated-only public_profiles view
begin;

-- Profiles: force RLS and remove broad visibility
alter table if exists public.profiles enable row level security;
alter table if exists public.profiles force row level security;
revoke all on table public.profiles from public, anon;

-- Remove legacy/broad profile policies
drop policy if exists "Anyone can view public nicknames" on public.profiles;
drop policy if exists "Authenticated users can view all nicknames" on public.profiles;
drop policy if exists "Authenticated users can view profiles in notifications" on public.profiles;
drop policy if exists "Users can view profiles in their conversations" on public.profiles;
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Profiles select own" on public.profiles;
drop policy if exists "Profiles insert own" on public.profiles;
drop policy if exists "Profiles update own" on public.profiles;
drop policy if exists "Profiles delete own" on public.profiles;
drop policy if exists "Public read profiles" on public.profiles;
drop policy if exists "Anon read profiles" on public.profiles;
drop policy if exists "Auth read profiles" on public.profiles;

-- Owner-scoped profile policies
create policy "profiles_select_self" on public.profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "profiles_insert_self" on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "profiles_update_self" on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "profiles_delete_self" on public.profiles
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Replace broad public view with a safe projection
revoke all on function public.get_profiles_public from public, anon, authenticated, service_role;
drop view if exists public.profiles_public;
drop function if exists public.get_profiles_public();

create or replace function public.get_public_profiles()
returns table (
  user_id uuid,
  nickname text,
  avatar_url text,
  bio text,
  handle text,
  is_nickname_public boolean,
  nickname_visibility public.nickname_visibility_enum,
  subscription_tier text,
  followers_count integer,
  following_count integer,
  posts_count integer,
  level integer,
  total_points integer,
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
    subscription_tier,
    followers_count,
    following_count,
    posts_count,
    level,
    total_points,
    created_at
  from public.profiles
  where coalesce(is_nickname_public, true) = true;
$$;

revoke all on function public.get_public_profiles from public, anon;
grant execute on function public.get_public_profiles to authenticated, service_role;

drop view if exists public.public_profiles;
create or replace view public.public_profiles as
  select * from public.get_public_profiles();

revoke all on public.public_profiles from public, anon;
grant select on public.public_profiles to authenticated, service_role;

-- Subscriptions: enforce owner-only access
alter table if exists public.subscriptions enable row level security;
alter table if exists public.subscriptions force row level security;
revoke all on table public.subscriptions from public, anon;

drop policy if exists "sub_read_own" on public.subscriptions;
drop policy if exists "Users can view their own subscription" on public.subscriptions;
drop policy if exists "subscriptions_select_self" on public.subscriptions;
drop policy if exists "subscriptions_insert_self" on public.subscriptions;
drop policy if exists "subscriptions_update_self" on public.subscriptions;
drop policy if exists "subscriptions_delete_self" on public.subscriptions;

create policy "subscriptions_select_self" on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "subscriptions_insert_self" on public.subscriptions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "subscriptions_update_self" on public.subscriptions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "subscriptions_delete_self" on public.subscriptions
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Service role can manage subscriptions" on public.subscriptions;
create policy "Service role can manage subscriptions" on public.subscriptions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

commit;
