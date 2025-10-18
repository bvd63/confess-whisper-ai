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
    cacheTTL: 60 * 1000, // 1 minute cache
    useCircuitBreaker: false, // Auth is local, no need for circuit breaker
    useRetry: false, // Auth checks are fast, no retry needed
    useDedupe: true, // Keep deduplication
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

  // Return isLoading as true until we have a definitive result (user or null)
  // This prevents race conditions where isLoading becomes false before user state is set
  return { user, isLoading: isLoading || (data === undefined && user === null) };
};
