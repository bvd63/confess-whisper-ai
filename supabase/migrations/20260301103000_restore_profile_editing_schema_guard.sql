-- Restore profile editing safety for nickname/bio and ownership constraints

alter table if exists public.profiles
  add column if not exists nickname text,
  add column if not exists bio text;

alter table if exists public.profiles enable row level security;
alter table if exists public.profiles force row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, user_id)
  values (new.id, new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'on_auth_user_created'
      and tgrelid = 'auth.users'::regclass
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row
      execute function public.handle_new_user();
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_own_uid'
  ) then
    execute 'create policy "profiles_select_own_uid" on public.profiles for select using (auth.uid() = user_id or auth.uid() = id)';
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_insert_own_uid'
  ) then
    execute 'create policy "profiles_insert_own_uid" on public.profiles for insert with check (auth.uid() = user_id and (id is null or auth.uid() = id))';
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_update_own_uid'
  ) then
    execute 'create policy "profiles_update_own_uid" on public.profiles for update using (auth.uid() = user_id or auth.uid() = id) with check (auth.uid() = user_id or auth.uid() = id)';
  end if;
end
$$;
