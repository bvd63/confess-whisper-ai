do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename  = 'profiles'
      and policyname = 'Profiles select own'
  ) then
    execute 'comment on policy "Profiles select own" on public.profiles is null';
  end if;
end
$$;
