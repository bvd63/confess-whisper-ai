-- Strengthen coin purchase idempotency under concurrent webhook retries.
begin;

create or replace function public.award_coins(
  p_user_id uuid,
  p_amount integer,
  p_session_id text,
  p_description text default 'Coin purchase'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance integer;
  v_transaction_id uuid;
  v_session_marker text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'FORBIDDEN';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if p_session_id is null or btrim(p_session_id) = '' then
    raise exception 'INVALID_SESSION_ID';
  end if;

  v_session_marker := 'Session: ' || btrim(p_session_id);

  -- Serialize all writes for the same checkout session.
  perform pg_advisory_xact_lock(hashtext(v_session_marker));

  if exists (
    select 1
    from coin_transactions
    where user_id = p_user_id
      and description ilike '%' || v_session_marker || '%'
  ) then
    return jsonb_build_object(
      'success', false,
      'error', 'duplicate_transaction',
      'message', 'Coins already awarded for this purchase'
    );
  end if;

  insert into user_coins (user_id, balance, lifetime_earned)
  values (p_user_id, p_amount, p_amount)
  on conflict (user_id)
  do update set
    balance = user_coins.balance + p_amount,
    lifetime_earned = user_coins.lifetime_earned + p_amount,
    updated_at = now()
  returning balance into v_new_balance;

  insert into coin_transactions (
    user_id,
    amount,
    type,
    description,
    reference_id
  ) values (
    p_user_id,
    p_amount,
    'purchase',
    p_description || ' - ' || v_session_marker,
    gen_random_uuid()
  )
  returning id into v_transaction_id;

  return jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'transaction_id', v_transaction_id,
    'coins_awarded', p_amount
  );
exception
  when others then
    return jsonb_build_object(
      'success', false,
      'error', sqlerrm
    );
end;
$$;

commit;
