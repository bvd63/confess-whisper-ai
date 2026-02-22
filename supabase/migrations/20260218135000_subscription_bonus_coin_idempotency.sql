-- Prevent duplicate subscription bonus coin awards for the same user/event key.
begin;

create unique index if not exists idx_coin_transactions_subscription_bonus_idempotency
on public.coin_transactions (user_id, type, reference_id)
where reference_id is not null
  and type like 'subscription_%_bonus';

commit;
