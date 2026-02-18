-- Patch: ensure profile owner policies exist and comment cleanup is safe/idempotent

alter table if exists public.profiles enable row level security;
alter table if exists public.profiles force row level security;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'profiles'
         AND policyname = 'Profiles select own'
     )
  THEN
    EXECUTE 'create policy "Profiles select own" on public.profiles for select using (auth.uid() = user_id)';
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'profiles'
         AND policyname = 'Profiles insert own'
     )
  THEN
    EXECUTE 'create policy "Profiles insert own" on public.profiles for insert with check (auth.uid() = user_id)';
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'profiles'
         AND policyname = 'Profiles update own'
     )
  THEN
    EXECUTE 'create policy "Profiles update own" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Profiles select own'
  ) THEN
    EXECUTE 'comment on policy "Profiles select own" on public.profiles is null';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Profiles insert own'
  ) THEN
    EXECUTE 'comment on policy "Profiles insert own" on public.profiles is null';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Profiles update own'
  ) THEN
    EXECUTE 'comment on policy "Profiles update own" on public.profiles is null';
  END IF;
END
$$;
