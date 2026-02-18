-- Harden high-risk RPCs before production launch.
-- Focus: privilege boundaries, user-ownership checks, and negative-amount coin abuse.
begin;

-- Restrict direct minting APIs to service role only.
revoke all on function public.award_coins(uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.award_coins(uuid, integer, text, text, uuid) from public, anon, authenticated;
grant execute on function public.award_coins(uuid, integer, text, text) to service_role;
grant execute on function public.award_coins(uuid, integer, text, text, uuid) to service_role;

-- Trial lifecycle mutators should only run through trusted backend paths.
revoke all on function public.activate_trial(uuid) from public, anon, authenticated;
revoke all on function public.check_trial_expiry(uuid) from public, anon, authenticated;
revoke all on function public.revoke_trial_purchases(uuid) from public, anon, authenticated;
grant execute on function public.activate_trial(uuid) to service_role;
grant execute on function public.check_trial_expiry(uuid) to service_role;
grant execute on function public.revoke_trial_purchases(uuid) to service_role;

-- Session revocation can be user-self or service role only.
create or replace function public.revoke_all_user_sessions(_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from _user_id then
    raise exception 'FORBIDDEN';
  end if;

  update auth_sessions
  set revoked_at = now()
  where user_id = _user_id
    and revoked_at is null;
end;
$$;

revoke all on function public.revoke_all_user_sessions(uuid) from public, anon;
grant execute on function public.revoke_all_user_sessions(uuid) to authenticated, service_role;

-- Confession quota helpers must not accept cross-user identifiers from clients.
create or replace function public.get_daily_confession_count(_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from _user_id then
    raise exception 'FORBIDDEN';
  end if;

  select count into v_count
  from daily_confession_counts
  where user_id = _user_id and date = current_date;

  if v_count is null then
    insert into daily_confession_counts (user_id, date, count)
    values (_user_id, current_date, 0)
    on conflict (user_id, date) do nothing;
    return 0;
  end if;

  return v_count;
end;
$$;

create or replace function public.increment_daily_confession_count(_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_count integer;
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from _user_id then
    raise exception 'FORBIDDEN';
  end if;

  insert into daily_confession_counts (user_id, date, count)
  values (_user_id, current_date, 1)
  on conflict (user_id, date)
  do update set
    count = daily_confession_counts.count + 1,
    updated_at = now()
  returning count into v_new_count;

  return v_new_count;
end;
$$;

create or replace function public.can_user_post_confession(_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_count integer;
  v_tier text;
  v_limit integer;
  v_can_post boolean;
  v_trial_active boolean;
  v_trial_ends_at timestamp with time zone;
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from _user_id then
    raise exception 'FORBIDDEN';
  end if;

  v_count := get_daily_confession_count(_user_id);

  select
    coalesce(subscription_tier, 'free'),
    coalesce(trial_active, false),
    trial_premium_ends_at
  into v_tier, v_trial_active, v_trial_ends_at
  from profiles
  where user_id = _user_id;

  if v_trial_active and v_trial_ends_at is not null and v_trial_ends_at > now() then
    v_tier := 'premium';
  end if;

  case v_tier
    when 'free' then v_limit := 5;
    when 'premium' then v_limit := 10;
    when 'vip' then v_limit := -1;
    else v_limit := 5;
  end case;

  if v_limit = -1 then
    v_can_post := true;
  else
    v_can_post := v_count < v_limit;
  end if;

  return jsonb_build_object(
    'can_post', v_can_post,
    'current_count', v_count,
    'daily_limit', v_limit,
    'tier', v_tier,
    'remaining', case when v_limit = -1 then -1 else greatest(0, v_limit - v_count) end
  );
end;
$$;

revoke all on function public.get_daily_confession_count(uuid) from public, anon;
revoke all on function public.increment_daily_confession_count(uuid) from public, anon;
revoke all on function public.can_user_post_confession(uuid) from public, anon;
grant execute on function public.get_daily_confession_count(uuid) to authenticated, service_role;
grant execute on function public.increment_daily_confession_count(uuid) to authenticated, service_role;
grant execute on function public.can_user_post_confession(uuid) to authenticated, service_role;

-- Prevent negative/zero deductions and cross-user debits.
create or replace function public.deduct_coins(
  _user_id uuid,
  _amount integer,
  _type text,
  _description text default null,
  _reference_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance integer;
begin
  if _amount is null or _amount <= 0 then
    return false;
  end if;

  if auth.role() <> 'service_role' and auth.uid() is distinct from _user_id then
    raise exception 'FORBIDDEN';
  end if;

  select balance into current_balance
  from user_coins
  where user_id = _user_id;

  if current_balance is null or current_balance < _amount then
    return false;
  end if;

  update user_coins
  set balance = balance - _amount,
      updated_at = now()
  where user_id = _user_id;

  insert into coin_transactions (user_id, amount, type, description, reference_id)
  values (_user_id, -_amount, _type, _description, _reference_id);

  return true;
end;
$$;

revoke all on function public.deduct_coins(uuid, integer, text, text, uuid) from public, anon;
grant execute on function public.deduct_coins(uuid, integer, text, text, uuid) to authenticated, service_role;

commit;
