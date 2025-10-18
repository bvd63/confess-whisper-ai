import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOptimizedQuery } from "./useOptimizedQuery";
import type { User } from "@supabase/supabase-js";

export const useCurrentUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const mountedRef = useRef(true);

  const { data, isLoading } = useOptimizedQuery<User | null>({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
    cacheTTL: 30 * 1000, // 30 seconds
  });

  useEffect(() => {
    mountedRef.current = true;
    if (data !== undefined) {
      setUser(data);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mountedRef.current) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [data]);

  return { user, isLoading };
};
