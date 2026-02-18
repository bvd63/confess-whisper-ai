-- Make deduct_coins atomic and race-safe under concurrent requests.
begin;

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
  v_new_balance integer;
begin
  if _amount is null or _amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if auth.role() <> 'service_role' and auth.uid() is distinct from _user_id then
    raise exception 'FORBIDDEN';
  end if;

  -- Atomic debit guard: only deduct when the row exists and has enough balance.
  update user_coins
  set
    balance = balance - _amount,
    updated_at = now()
  where user_id = _user_id
    and balance >= _amount
  returning balance into v_new_balance;

  if not found then
    raise exception 'INSUFFICIENT_COINS';
  end if;

  insert into coin_transactions (user_id, amount, type, description, reference_id)
  values (_user_id, -_amount, _type, _description, _reference_id);

  return true;
end;
$$;

commit;
