import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface PrefetchOptions {
  enabled?: boolean;
  staleTime?: number;
}

/**
 * Smart prefetching hook using requestIdleCallback
 * Prefetches data on hover for better UX
 */
export const usePrefetch = () => {
  const queryClient = useQueryClient();
  const prefetchTimeouts = useRef<Map<string, number>>(new Map());

  const fetchExplorePrefetch = async () => {
    const { fetchTrendingConfessions } = await import('@/services/exploreFeedService');
    const result = await fetchTrendingConfessions();
    return result.items;
  };

  useEffect(() => {
    return () => {
      // Cleanup all pending prefetches
      prefetchTimeouts.current.forEach((timeout) => {
        clearTimeout(timeout);
      });
      prefetchTimeouts.current.clear();
    };
  }, []);

  /**
   * Prefetch user profile on hover
   */
  const prefetchUserProfile = (
    userId: string,
    options: PrefetchOptions = {}
  ) => {
    const { enabled = true, staleTime = 5 * 60 * 1000 } = options;

    if (!enabled) return;

    const prefetchKey = `user-profile-${userId}`;

    // Use requestIdleCallback for non-blocking prefetch
    if ('requestIdleCallback' in window) {
      const idleCallback = requestIdleCallback(
        () => {
          queryClient.prefetchQuery({
            queryKey: ['profile', userId],
            queryFn: async () => {
              const { supabase } = await import('@/integrations/supabase/client');
              const { data } = await supabase
                .from('public_profiles')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();
              return data;
            },
            staleTime,
          });
        },
        { timeout: 2000 }
      );

      prefetchTimeouts.current.set(prefetchKey, idleCallback as unknown as number);
    } else {
      // Fallback to setTimeout
      const timeout = setTimeout(() => {
        queryClient.prefetchQuery({
          queryKey: ['profile', userId],
          queryFn: async () => {
            const { supabase } = await import('@/integrations/supabase/client');
            const { data } = await supabase
              .from('public_profiles')
              .select('*')
              .eq('user_id', userId)
              .maybeSingle();
            return data;
          },
          staleTime,
        });
      }, 100);

      prefetchTimeouts.current.set(prefetchKey, timeout as unknown as number);
    }
  };

  /**
   * Prefetch community data on hover
   */
  const prefetchCommunity = (
    communityId: string,
    options: PrefetchOptions = {}
  ) => {
    const { enabled = true, staleTime = 5 * 60 * 1000 } = options;

    if (!enabled) return;

    const prefetchKey = `community-${communityId}`;

    if ('requestIdleCallback' in window) {
      const idleCallback = requestIdleCallback(
        () => {
          queryClient.prefetchQuery({
            queryKey: ['community', communityId],
            queryFn: async () => {
              const { supabase } = await import('@/integrations/supabase/client');
              const { data } = await supabase
                .from('communities')
                .select('*')
                .eq('id', communityId)
                .single();
              return data;
            },
            staleTime,
          });
        },
        { timeout: 2000 }
      );

      prefetchTimeouts.current.set(prefetchKey, idleCallback as unknown as number);
    } else {
      const timeout = setTimeout(() => {
        queryClient.prefetchQuery({
          queryKey: ['community', communityId],
          queryFn: async () => {
            const { supabase } = await import('@/integrations/supabase/client');
            const { data } = await supabase
              .from('communities')
              .select('*')
              .eq('id', communityId)
              .single();
            return data;
          },
          staleTime,
        });
      }, 100);

      prefetchTimeouts.current.set(prefetchKey, timeout as unknown as number);
    }
  };

  /**
   * Prefetch next page in pagination
   */
  const prefetchNextPage = (
    queryKey: string[],
    nextCursor: string | null,
    queryFn: (cursor: string) => Promise<any>,
    options: PrefetchOptions = {}
  ) => {
    const { enabled = true, staleTime = 2 * 60 * 1000 } = options;

    if (!enabled || !nextCursor) return;

    const prefetchKey = `next-page-${queryKey.join('-')}`;

    if ('requestIdleCallback' in window) {
      const idleCallback = requestIdleCallback(
        () => {
          queryClient.prefetchQuery({
            queryKey: [...queryKey, nextCursor],
            queryFn: () => queryFn(nextCursor),
            staleTime,
          });
        },
        { timeout: 2000 }
      );

      prefetchTimeouts.current.set(prefetchKey, idleCallback as unknown as number);
    } else {
      const timeout = setTimeout(() => {
        queryClient.prefetchQuery({
          queryKey: [...queryKey, nextCursor],
          queryFn: () => queryFn(nextCursor),
          staleTime,
        });
      }, 100);

      prefetchTimeouts.current.set(prefetchKey, timeout as unknown as number);
    }
  };

  /**
   * Prefetch page data based on tab
   */
  const prefetchPage = (page: string) => {
    const prefetchKey = `page-${page}`;

    if ('requestIdleCallback' in window) {
      const idleCallback = requestIdleCallback(
        () => {
          switch (page) {
            case 'explore':
              queryClient.prefetchQuery({
                queryKey: ['confessions', 'explore'],
                queryFn: fetchExplorePrefetch,
                staleTime: 2 * 60 * 1000,
              });
              break;
            case 'messages':
              queryClient.prefetchQuery({
                queryKey: ['conversations'],
                queryFn: async () => {
                  const { supabase } = await import('@/integrations/supabase/client');
                  const { data } = await supabase
                    .from('conversations')
                    .select('*')
                    .order('updated_at', { ascending: false })
                    .limit(20);
                  return data;
                },
                staleTime: 1 * 60 * 1000,
              });
              break;
          }
        },
        { timeout: 2000 }
      );

      prefetchTimeouts.current.set(prefetchKey, idleCallback as unknown as number);
    } else {
      const timeout = setTimeout(() => {
        switch (page) {
          case 'explore':
            queryClient.prefetchQuery({
              queryKey: ['confessions', 'explore'],
              queryFn: fetchExplorePrefetch,
              staleTime: 2 * 60 * 1000,
            });
            break;
          case 'messages':
            queryClient.prefetchQuery({
              queryKey: ['conversations'],
              queryFn: async () => {
                const { supabase } = await import('@/integrations/supabase/client');
                const { data } = await supabase
                  .from('conversations')
                  .select('*')
                  .order('updated_at', { ascending: false })
                  .limit(20);
                return data;
              },
              staleTime: 1 * 60 * 1000,
            });
            break;
        }
      }, 100);

      prefetchTimeouts.current.set(prefetchKey, timeout as unknown as number);
    }
  };

  /**
   * Cancel specific prefetch
   */
  const cancelPrefetch = (key: string) => {
    const timeout = prefetchTimeouts.current.get(key);
    if (timeout) {
      if ('requestIdleCallback' in window) {
        cancelIdleCallback(timeout);
      } else {
        clearTimeout(timeout);
      }
      prefetchTimeouts.current.delete(key);
    }
  };

  return {
    prefetchUserProfile,
    prefetchCommunity,
    prefetchNextPage,
    prefetchPage,
    cancelPrefetch,
  };
};
