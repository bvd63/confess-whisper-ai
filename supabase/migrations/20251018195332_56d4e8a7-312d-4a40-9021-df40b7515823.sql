-- Fix Security Definer View warning
-- PostgreSQL 17 syntax: Use ALTER VIEW to set security_invoker option
-- This makes views respect RLS policies of the calling user

-- Fix trending_confessions view
ALTER VIEW trending_confessions SET (security_invoker = on);

-- Fix user_post_counts view  
ALTER VIEW user_post_counts SET (security_invoker = on);

COMMENT ON VIEW trending_confessions IS 'View with SECURITY INVOKER - respects RLS policies of calling user';
COMMENT ON VIEW user_post_counts IS 'View with SECURITY INVOKER - respects RLS policies of calling user';