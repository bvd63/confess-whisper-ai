import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import AppLayout from "@/components/AppLayout";
import ConfessionCard from "@/components/ConfessionCard";
import { ConfessionCardSkeleton } from "@/components/skeletons/ConfessionCardSkeleton";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useMessageNotifications } from "@/hooks/useMessageNotifications";
import { useVipStatus } from "@/hooks/usePremiumStatus";
import { useSubscriptionCheck } from "@/hooks/useSubscriptionCheck";
import SEOHead from "@/components/SEOHead";
import { useIsMobile } from "@/hooks/use-mobile";
import { UnifiedShopDialog } from "@/components/UnifiedShopDialog";
import { supabase } from "@/integrations/supabase/client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { attachActiveBoosts } from "@/lib/boosts";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useScrollHeader } from "@/hooks/useScrollHeader";
import { Loader2 } from "lucide-react";

// Lazy load heavy components
const NewConfessionDialog = lazy(() => import("@/components/NewConfessionDialog"));
const OnboardingDialog = lazy(() => import("@/components/OnboardingDialog"));

const Index = () => {
  const navigate = useNavigate();
  const { trackEvent } = useAnalytics();
  const { t, language } = useLanguage();
  const { user } = useCurrentUser();
  const { isVip } = useVipStatus(user?.id);
  useSubscriptionCheck(user?.id);
  useMessageNotifications({ userId: user?.id });
  const [isNewConfessionOpen, setIsNewConfessionOpen] = useState(false);
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);
  const [dialogDefaultTab, setDialogDefaultTab] = useState<'subscriptions' | 'coins'>('subscriptions');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const PAGE_SIZE = 30;
  
  // Scroll header behavior for Home Feed
  const isHeaderVisible = useScrollHeader({ threshold: 12, topOffset: 30 });
  
  // Fetch mixed feed (following + explore) with adaptive ratios
  const { data, isLoading, error: queryError, refetch } = useInfiniteQuery({
    queryKey: ["home-mixed-feed", user?.id],
    initialPageParam: null as Record<string, unknown> | null,
    queryFn: async ({ pageParam }) => {
      try {
        const { data, error } = await supabase.rpc("get_mixed_feed", {
          p_limit: PAGE_SIZE,
          p_cursor: pageParam,
        });

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          return attachActiveBoosts(data);
        }
      } catch (rpcError) {
        console.error('Error fetching mixed feed:', rpcError);
      }

      // Safe fallback: revert to simple public feed when mixed feed errors or returns empty
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("confessions")
        .select("*")
        .eq("moderation_status", "approved")
        .or("is_draft.is.null,is_draft.eq.false")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (fallbackError) {
        console.error('Fallback feed error:', fallbackError);
        throw fallbackError;
      }

      return attachActiveBoosts(fallbackData || []);
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < PAGE_SIZE) return null;
      const last = lastPage[lastPage.length - 1];
      return {
        mix_order: last.mix_order,
        score: last.score,
        created_at: last.created_at,
        id: last.id,
      };
    },
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60, // 1 minute
  });

  const confessions = data?.pages.flat() ?? [];

  // Pull to refresh
  const { containerRef, isRefreshing, pullDistance, isTriggered } = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
    },
    threshold: 80,
  });

  // Log query state for debugging
  useEffect(() => {
    console.log('Home Feed Query State:', { 
      isLoading, 
      hasData: confessions.length > 0, 
      count: confessions.length,
      error: queryError 
    });
  }, [isLoading, confessions, queryError]);

  useEffect(() => {
    const channel = supabase
      .channel('home-mixed-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'confessions', filter: 'moderation_status=eq.approved' },
        () => refetch()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'confessions', filter: 'moderation_status=eq.approved' },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  useEffect(() => {
    // Track page view
    trackEvent('page_view', { page: 'index' });
    
    // Check if user is new (show onboarding)
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setTimeout(() => setShowOnboarding(true), 1000);
    }
    
    // Check for referral code
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      localStorage.setItem('referralCode', refCode);
    }
    
    // Check for Stripe checkout status
    const checkoutStatus = urlParams.get('status');
    if (checkoutStatus === 'success') {
      // Award first VIP purchase coins
      (async () => {
        try {
          const response = await supabase.functions.invoke('award-subscription-coins', {
            body: { isFirstPurchase: true }
          });
          
          if (response.data?.awarded) {
            toast({
              title: t.plans_vip_activated || '👑 You\'re now VIP!',
              description: `${t.plans_vip_welcome || 'Welcome to VIP! Enjoy exclusive features.'} You received ${response.data.awarded} coins! 🎉`,
            });
          } else {
            toast({
              title: t.plans_vip_activated || '👑 You\'re now VIP!',
              description: t.plans_vip_welcome || 'Welcome to VIP! Enjoy exclusive features.',
            });
          }
        } catch (error) {
          // Even if coin award fails, show success for VIP activation
          toast({
            title: t.plans_vip_activated || '👑 You\'re now VIP!',
            description: t.plans_vip_welcome || 'Welcome to VIP! Enjoy exclusive features.',
          });
        }
      })();
      
      // Clean URL
      window.history.replaceState({}, '', '/');
    } else if (checkoutStatus === 'cancel') {
      toast({
        title: 'Checkout Cancelled',
        description: 'Your checkout was cancelled. You can try again anytime.',
        variant: 'destructive',
      });
      // Clean URL
      window.history.replaceState({}, '', '/');
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewConfession = () => {
    if (!user) {
      navigate('/auth');
      toast({
        title: t.error_auth,
        description: t.error_auth,
      });
      return;
    }
    
    trackEvent('confession_create_clicked');
    
    // On mobile, route to /compose; on desktop, open dialog inline
    if (isMobile) {
      navigate('/compose');
    } else {
      setIsNewConfessionOpen(true);
    }
  };

  return (
    <>
      <SEOHead />
      <AppLayout 
        onNewConfession={handleNewConfession}
        onManageSubscription={(defaultTab = 'subscriptions') => {
          setDialogDefaultTab(defaultTab);
          setManageSubDialogOpen(true);
        }}
        hideHeaderOnScroll={true}
        isHeaderVisible={isHeaderVisible}
      >
      {/* Pull to Refresh Indicator */}
      {pullDistance > 0 && (
        <div 
          className="fixed top-16 left-0 right-0 z-50 flex justify-center pointer-events-none"
          style={{ 
            transform: `translateY(${Math.min(pullDistance - 80, 0)}px)`,
            opacity: Math.min(pullDistance / 80, 1)
          }}
        >
          <div className="bg-primary/10 backdrop-blur-sm rounded-full p-2">
            <Loader2 className={`h-5 w-5 text-primary ${isRefreshing || isTriggered ? 'animate-spin' : ''}`} />
          </div>
        </div>
      )}

      {/* Main Feed */}
      <main 
        ref={containerRef}
        className="container max-w-2xl mx-auto px-4 py-6 pb-24"
      >
        {/* Confession Feed */}
        {(isLoading && !isRefreshing) ? (
          <div className="space-y-4">
            <ConfessionCardSkeleton />
            <ConfessionCardSkeleton />
            <ConfessionCardSkeleton />
            <ConfessionCardSkeleton />
          </div>
        ) : confessions.length > 0 ? (
          <div className="space-y-4">
            {confessions.map((confession) => (
              <ConfessionCard
                key={confession.id}
                confession={confession}
                isVip={isVip}
                onUpgradeClick={() => {
                  setDialogDefaultTab('subscriptions');
                  setManageSubDialogOpen(true);
                }}
                onInsightGenerated={() => {
                  toast({
                    title: t.deep_insight_success,
                  });
                }}
              />
            ))}
          </div>
        ) : !isLoading ? (
          <div className="py-12 text-center">
            <p className="text-lg font-medium text-white/80 mb-2">
              {t.index_no_confessions_title}
            </p>
            <p className="text-sm text-white/50">
              {t.index_no_confessions_desc}
            </p>
          </div>
        ) : null}
      </main>

      {/* Dialogs with Suspense for lazy loading */}
      <Suspense fallback={
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">{t.ui_loading}</p>
          </div>
        </div>
      }>
        <NewConfessionDialog
          open={isNewConfessionOpen}
          onOpenChange={setIsNewConfessionOpen}
          onConfessionCreated={() => {
            trackEvent('confession_created');
            // Refetch home feed to show newly created confession
            refetch();
          }}
        />

        <OnboardingDialog
          open={showOnboarding}
          onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem('hasSeenOnboarding', 'true');
          }}
        />
      </Suspense>

      <UnifiedShopDialog
        open={manageSubDialogOpen}
        onOpenChange={setManageSubDialogOpen}
        defaultTab={dialogDefaultTab}
      />

      </AppLayout>
    </>
  );
};

export default Index;
