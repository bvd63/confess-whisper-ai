-- Make rate-limit counting atomic and concurrency-safe.
begin;

create or replace function public.increment_rate_limit_counter(
  _key text,
  _window_ms integer
)
returns table(current_count integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if _key is null or btrim(_key) = '' then
    raise exception 'INVALID_RATE_LIMIT_KEY';
  end if;

  if _window_ms is null or _window_ms <= 0 then
    raise exception 'INVALID_RATE_LIMIT_WINDOW';
  end if;

  return query
  insert into public.rate_limits as rl (key, count, reset_at)
  values (
    _key,
    1,
    now() + ((_window_ms::text || ' milliseconds')::interval)
  )
  on conflict (key) do update
  set
    count = case
      when rl.reset_at <= now() then 1
      else rl.count + 1
    end,
    reset_at = case
      when rl.reset_at <= now() then now() + ((_window_ms::text || ' milliseconds')::interval)
      else rl.reset_at
    end
  returning rl.count, rl.reset_at;
end;
$$;

revoke all on function public.increment_rate_limit_counter(text, integer) from public, anon, authenticated;
grant execute on function public.increment_rate_limit_counter(text, integer) to service_role;

commit;
