-- Harden activate_trial: service-role-only execution, one-time, exact 3-day trial window.
begin;

create or replace function public.activate_trial(_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_now timestamptz := now();
  v_trial_end timestamptz := v_now + interval '3 days';
begin
  if _user_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'invalid_user_id'
    );
  end if;

  select
    user_id,
    trial_used,
    trial_active,
    trial_activated_at,
    trial_end_date,
    trial_premium_ends_at
  into v_profile
  from public.profiles
  where user_id = _user_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'user_not_found'
    );
  end if;

  if coalesce(v_profile.trial_used, false) then
    return jsonb_build_object(
      'success', false,
      'error', 'trial_already_used',
      'trial_activated_at', v_profile.trial_activated_at,
      'trial_ends_at', coalesce(v_profile.trial_premium_ends_at, v_profile.trial_end_date),
      'trial_duration_days', 3
    );
  end if;

  update public.profiles
  set
    trial_active = true,
    trial_activated_at = v_now,
    trial_end_date = v_trial_end,
    trial_premium_ends_at = v_trial_end,
    trial_used = true,
    trial_premium_used = true,
    updated_at = v_now
  where user_id = _user_id;

  return jsonb_build_object(
    'success', true,
    'trial_activated_at', v_now,
    'trial_ends_at', v_trial_end,
    'trial_duration_days', 3
  );
end;
$$;

revoke all on function public.activate_trial(uuid) from public, anon, authenticated;
grant execute on function public.activate_trial(uuid) to service_role;

commit;
