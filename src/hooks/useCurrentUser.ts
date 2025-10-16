import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

// Global cache for user data to prevent duplicate requests
let userCache: { user: User | null; timestamp: number } | null = null;
let pendingUserRequest: Promise<User | null> | null = null;
const CACHE_DURATION = 30000; // 30 seconds

export const useCurrentUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mountedRef.current) {
        const newUser = session?.user ?? null;
        setUser(newUser);
        // Update cache when auth state changes
        userCache = { user: newUser, timestamp: Date.now() };
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      // Check cache first
      if (userCache && Date.now() - userCache.timestamp < CACHE_DURATION) {
        if (mountedRef.current) {
          setUser(userCache.user);
          setIsLoading(false);
        }
        return;
      }

      // If there's already a pending request, wait for it
      if (pendingUserRequest) {
        const cachedUser = await pendingUserRequest;
        if (mountedRef.current) {
          setUser(cachedUser);
          setIsLoading(false);
        }
        return;
      }

      // Create new request
      pendingUserRequest = supabase.auth.getUser().then(({ data }) => data.user);
      const fetchedUser = await pendingUserRequest;
      
      // Update cache
      userCache = { user: fetchedUser, timestamp: Date.now() };
      
      if (mountedRef.current) {
        setUser(fetchedUser);
      }
    } catch (error) {
      console.error("Error checking user:", error);
      if (mountedRef.current) {
        setUser(null);
      }
    } finally {
      pendingUserRequest = null;
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  return { user, isLoading };
};
