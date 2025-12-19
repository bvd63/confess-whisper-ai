-- Rebuild profiles_public with a minimal safe surface and lock down profiles access
begin;

-- Ensure RLS is enforced on profiles
alter table if exists public.profiles enable row level security;
alter table if exists public.profiles force row level security;

-- Remove broad privileges from anonymous/authenticated roles
revoke all on table public.profiles from anon, authenticated;

drop policy if exists "Profiles select own" on public.profiles;
drop policy if exists "Profiles insert own" on public.profiles;
drop policy if exists "Profiles update own" on public.profiles;
drop policy if exists "Public read profiles" on public.profiles;
drop policy if exists "Anon read profiles" on public.profiles;
drop policy if exists "Auth read profiles" on public.profiles;
drop policy if exists "Authenticated users can search for users by nickname" on public.profiles;
drop policy if exists "Users can view profiles in their conversations" on public.profiles;
drop policy if exists "Allow profile read" on public.profiles;

-- Owner-scoped policies
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

grant select, insert, update, delete on public.profiles to authenticated;

-- Rebuild public-safe view and function with minimal columns
drop view if exists public.profiles_public;
drop function if exists public.get_profiles_public();

create or replace function public.get_profiles_public()
returns table (
  user_id uuid,
  nickname text,
  handle text,
  avatar_url text,
  bio text,
  is_nickname_public boolean,
  nickname_visibility public.nickname_visibility_enum,
  followers_count integer,
  following_count integer,
  posts_count integer
)
language sql
security definer
set search_path = public
as $$
  select
    user_id,
    nickname,
    handle,
    avatar_url,
    bio,
    coalesce(is_nickname_public, true) as is_nickname_public,
    nickname_visibility,
    followers_count,
    following_count,
    posts_count
  from public.profiles;
$$;

grant execute on function public.get_profiles_public to anon, authenticated;

create or replace view public.profiles_public as
  select * from public.get_profiles_public();

grant select on public.profiles_public to anon, authenticated;

commit;
