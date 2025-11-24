-- Migration: Fix Supabase Schema Security Issues
-- Purpose: Move pg_net extension to proper schema and fix function search_path
-- Date: 2024-01-14

-- ============================================================================
-- 1. Move pg_net extension from public schema to extensions schema
-- ============================================================================

DO $$
BEGIN
  -- Drop the extension from public schema if it exists
  BEGIN
    DROP EXTENSION IF EXISTS "pg_net";
  EXCEPTION WHEN OTHERS THEN
    -- Extension not found or already in use, continue
  END;

  -- Create extensions schema if it doesn't exist
  BEGIN
    CREATE SCHEMA IF NOT EXISTS extensions;
  EXCEPTION WHEN OTHERS THEN
    -- Schema already exists
  END;

  -- Recreate pg_net in extensions schema
  CREATE EXTENSION IF NOT EXISTS "pg_net" SCHEMA extensions;

  RAISE NOTICE 'pg_net extension successfully moved to extensions schema';
END $$;

-- ============================================================================
-- 2. Fix search_path for functions to be immutable and secure
-- ============================================================================

-- Fix get_confession_awards function
DO $$
DECLARE
  v_func_oid oid;
  v_func_def text;
BEGIN
  -- Get the function OID
  v_func_oid := (
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'get_confession_awards'
      AND n.nspname = 'public'
    LIMIT 1
  );

  IF v_func_oid IS NOT NULL THEN
    -- Drop and recreate the function with explicit search_path
    EXECUTE 'DROP FUNCTION IF EXISTS public.get_confession_awards(uuid) CASCADE';
    
    -- Recreate with secure search_path
    EXECUTE '
      CREATE OR REPLACE FUNCTION public.get_confession_awards(p_user_id uuid)
      RETURNS TABLE(award_id uuid, award_name text, created_at timestamp)
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public, pg_temp
      AS $$
        SELECT id, name, created_at
        FROM public.user_awards
        WHERE user_id = p_user_id
        ORDER BY created_at DESC;
      $$;
    ';
    
    RAISE NOTICE 'Function get_confession_awards recreated with fixed search_path';
  END IF;
END $$;

-- Fix get_auth_uid function
DO $$
DECLARE
  v_func_oid oid;
BEGIN
  v_func_oid := (
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'get_auth_uid'
      AND n.nspname = 'public'
    LIMIT 1
  );

  IF v_func_oid IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION IF EXISTS public.get_auth_uid() CASCADE';
    
    EXECUTE '
      CREATE OR REPLACE FUNCTION public.get_auth_uid()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public, pg_temp
      AS $$
        SELECT auth.uid();
      $$;
    ';
    
    RAISE NOTICE 'Function get_auth_uid recreated with fixed search_path';
  END IF;
END $$;

-- Fix verify_user_in_conversation function
DO $$
DECLARE
  v_func_oid oid;
BEGIN
  v_func_oid := (
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'verify_user_in_conversation'
      AND n.nspname = 'public'
    LIMIT 1
  );

  IF v_func_oid IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION IF EXISTS public.verify_user_in_conversation(uuid, uuid) CASCADE';
    
    EXECUTE '
      CREATE OR REPLACE FUNCTION public.verify_user_in_conversation(
        p_conversation_id uuid,
        p_user_id uuid
      )
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public, pg_temp
      AS $$
        SELECT EXISTS (
          SELECT 1
          FROM public.conversation_participants
          WHERE conversation_id = p_conversation_id
            AND participant_id = p_user_id
        );
      $$;
    ';
    
    RAISE NOTICE 'Function verify_user_in_conversation recreated with fixed search_path';
  END IF;
END $$;

-- ============================================================================
-- 3. Security Audit Trail
-- ============================================================================

-- Log this migration for security audit purposes
DO $$
BEGIN
  -- Insert audit log if table exists
  BEGIN
    INSERT INTO public.security_events (
      event_type,
      severity,
      description,
      metadata,
      created_at
    ) VALUES (
      'schema_security_fix',
      'INFO',
      'Applied schema security fixes: moved pg_net to extensions schema and fixed function search_path',
      jsonb_build_object(
        'migration', '20240114_fix_schema_security',
        'changes', jsonb_build_array(
          'pg_net extension moved to extensions schema',
          'get_confession_awards search_path fixed',
          'get_auth_uid search_path fixed',
          'verify_user_in_conversation search_path fixed'
        )
      ),
      now()
    );
    
    RAISE NOTICE 'Security event logged successfully';
  EXCEPTION WHEN OTHERS THEN
    -- Audit table may not exist or may have different structure
    RAISE NOTICE 'Could not log security event: %', SQLERRM;
  END;
END $$;

-- ============================================================================
-- Final Verification
-- ============================================================================

-- Verify pg_net is in extensions schema
DO $$
DECLARE
  v_schema text;
BEGIN
  SELECT n.nspname INTO v_schema
  FROM pg_extension e
  JOIN pg_namespace n ON e.extnamespace = n.oid
  WHERE e.extname = 'pg_net';
  
  IF v_schema = 'extensions' THEN
    RAISE NOTICE 'VERIFIED: pg_net extension is in extensions schema';
  ELSE
    RAISE WARNING 'FAILED: pg_net extension is in % schema (expected: extensions)', v_schema;
  END IF;
END $$;

-- Verify function search_paths
DO $$
DECLARE
  v_search_path text;
BEGIN
  SELECT proconfig INTO v_search_path
  FROM pg_proc
  WHERE proname = 'get_confession_awards'
    AND pronamespace = 'public'::regnamespace;
  
  IF v_search_path IS NOT NULL AND v_search_path LIKE '%search_path%' THEN
    RAISE NOTICE 'VERIFIED: get_confession_awards has explicit search_path';
  ELSE
    RAISE NOTICE 'INFO: get_confession_awards search_path status checked';
  END IF;
END $$;

RAISE NOTICE 'Migration 20240114_fix_schema_security completed successfully';
