import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/AppLayout";
import SEOHead from "@/components/SEOHead";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSubscriptionCheck } from "@/hooks/useSubscriptionCheck";
import { useMessageNotifications } from "@/hooks/useMessageNotifications";
import { usePerformanceBudget } from "@/hooks/usePerformanceBudget";
import { UnifiedShopDialog } from "@/components/UnifiedShopDialog";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { supabase } from "@/integrations/supabase/client";
import ConfessionFeed from "@/components/ConfessionFeed";
import { useConfessions } from "@/hooks/useConfessions";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const NewConfessionDialog = lazy(() => import("@/components/NewConfessionDialog"));
const OnboardingDialog = lazy(() => import("@/components/OnboardingDialog"));

const Index = () => {
  const navigate = useNavigate();
  const { trackEvent } = useAnalytics();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const isMobile = useIsMobile();
  useSubscriptionCheck(user?.id);
  useMessageNotifications({ userId: user?.id });
  const [isNewConfessionOpen, setIsNewConfessionOpen] = useState(false);
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);
  const [dialogDefaultTab, setDialogDefaultTab] = useState<'subscriptions' | 'coins'>('subscriptions');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const { confessions, isLoading, reload } = useConfessions({ sortBy: 'popular', limit: 40 });
  
  // Pull to refresh
  const { containerRef, isRefreshing, pullDistance, isTriggered } = usePullToRefresh({
    onRefresh: async () => {
      await reload();
    },
    threshold: 80,
  });
  
  // Monitor performance budget
  usePerformanceBudget();

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

    return undefined;
  }, [t, toast, trackEvent]);

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

      {/* Main Content */}
      <main
        ref={containerRef}
        className="container mx-auto max-w-2xl px-4 py-6"
      >
        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-semibold text-white/80 shadow-lg shadow-black/20">
            <Flame className="h-4 w-4 text-primary" />
            {t.home_popular_label}
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-4xl font-bold text-foreground sm:text-5xl">
                {t.home_header_title}
              </h2>
              <p className="mt-2 text-base text-foreground-secondary">
                {t.home_popular_caption}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                setIsManualRefreshing(true);
                await reload();
                setIsManualRefreshing(false);
              }}
              className="h-11 rounded-full border border-white/10 bg-white/5 px-4 text-white hover:bg-white/15"
            >
              <Loader2 className={cn(
                "mr-2 h-4 w-4",
                (isManualRefreshing || isLoading) && "animate-spin"
              )} />
              {isManualRefreshing || isLoading ? t.ui_refreshing : t.home_refresh_button}
            </Button>
          </div>
        </section>

        <section className="mt-8">
          <ConfessionFeed
            confessions={confessions}
            isLoading={isLoading}
            currentUserId={user?.id}
            onNewConfession={handleNewConfession}
          />
        </section>
      </main>

      <Suspense
        fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">{t.ui_loading}</p>
            </div>
          </div>
        }
      >
        <NewConfessionDialog
          open={isNewConfessionOpen}
          onOpenChange={setIsNewConfessionOpen}
          onConfessionCreated={() => {
            trackEvent('confession_created');
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
