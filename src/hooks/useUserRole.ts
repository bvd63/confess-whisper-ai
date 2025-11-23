import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

export const useUserRole = (userId: string | undefined) => {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkRole = useCallback(async () => {
    if (!userId) return;

    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      setRole(data?.role || null);
    } catch (error) {
      logError('Error checking user role', error as Error);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    checkRole();
  }, [checkRole, userId]);

  const isAdmin = role === 'admin';
  const isModerator = role === 'moderator' || role === 'admin';
  const isUser = !!role;

  return {
    role,
    isAdmin,
    isModerator,
    isUser,
    loading,
  };
};
