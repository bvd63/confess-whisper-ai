-- Enable realtime for user_coins table
ALTER TABLE public.user_coins REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_coins;

-- Enable realtime for coin_transactions table  
ALTER TABLE public.coin_transactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coin_transactions;