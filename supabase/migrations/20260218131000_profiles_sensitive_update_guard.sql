-- Block client-side entitlement/payment/profile-metric tampering on profiles updates.
begin;

create or replace function public.guard_profiles_sensitive_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service role and trusted SECURITY DEFINER workflows may update protected fields.
  if auth.role() = 'service_role' or current_user = 'postgres' then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.is_premium is distinct from old.is_premium
    or new.is_shadow_banned is distinct from old.is_shadow_banned
    or new.password_changed_at is distinct from old.password_changed_at
    or new.referral_code is distinct from old.referral_code
    or new.referred_by is distinct from old.referred_by
    or new.stripe_customer_id is distinct from old.stripe_customer_id
    or new.stripe_subscription_id is distinct from old.stripe_subscription_id
    or new.subscription_cadence is distinct from old.subscription_cadence
    or new.subscription_cancel_at_period_end is distinct from old.subscription_cancel_at_period_end
    or new.subscription_ends_at is distinct from old.subscription_ends_at
    or new.subscription_status is distinct from old.subscription_status
    or new.subscription_tier is distinct from old.subscription_tier
    or new.trial_activated_at is distinct from old.trial_activated_at
    or new.trial_active is distinct from old.trial_active
    or new.trial_end_date is distinct from old.trial_end_date
    or new.trial_premium_ends_at is distinct from old.trial_premium_ends_at
    or new.trial_premium_started_at is distinct from old.trial_premium_started_at
    or new.trial_premium_used is distinct from old.trial_premium_used
    or new.trial_used is distinct from old.trial_used
    or new.followers_count is distinct from old.followers_count
    or new.following_count is distinct from old.following_count
    or new.posts_count is distinct from old.posts_count
    or new.level is distinct from old.level
    or new.total_points is distinct from old.total_points
    or new.total_referrals is distinct from old.total_referrals
    or new.last_daily_reward is distinct from old.last_daily_reward
  then
    raise exception 'FORBIDDEN_SENSITIVE_PROFILE_UPDATE';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profiles_sensitive_columns_trigger on public.profiles;
create trigger guard_profiles_sensitive_columns_trigger
before update on public.profiles
for each row
execute function public.guard_profiles_sensitive_columns();

commit;
