-- Create a helper function to fetch a user's nickname with proper privileges
CREATE OR REPLACE FUNCTION public.get_user_nickname(_target_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nickname
  FROM public.profiles
  WHERE user_id = _target_user_id
    AND nickname IS NOT NULL;
$$;

-- Restrict execution to authenticated users only
REVOKE ALL ON FUNCTION public.get_user_nickname(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_nickname(uuid) TO authenticated;