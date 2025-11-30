import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Coins } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import AppLayout from "@/components/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useMessageNotifications } from "@/hooks/useMessageNotifications";
import { useVipStatus } from "@/hooks/usePremiumStatus";
import { useSubscriptionCheck } from "@/hooks/useSubscriptionCheck";
import SEOHead from "@/components/SEOHead";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePerformanceBudget } from "@/hooks/usePerformanceBudget";
import { UnifiedShopDialog } from "@/components/UnifiedShopDialog";
import { supabase } from "@/integrations/supabase/client";
import { useCoins } from "@/hooks/useCoins";
import { useConfessions } from "@/hooks/useConfessions";
import ConfessionFeed from "@/components/ConfessionFeed";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Loader2 } from "lucide-react";

// Lazy load heavy components
const OnboardingDialog = lazy(() => import("@/components/OnboardingDialog"));

const Index = () => {
  const navigate = useNavigate();
  const { trackEvent } = useAnalytics();
  const { t, language } = useLanguage();
  const { user } = useCurrentUser();
  const { isVip } = useVipStatus(user?.id);
  const { balance } = useCoins(user?.id);
  useSubscriptionCheck(user?.id);
  useMessageNotifications({ userId: user?.id });
  const [isNewConfessionOpen, setIsNewConfessionOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);
  const [dialogDefaultTab, setDialogDefaultTab] = useState<'subscriptions' | 'coins'>('subscriptions');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Pull to refresh
  const { containerRef, isRefreshing, pullDistance, isTriggered } = usePullToRefresh({
    onRefresh: async () => {
      // Reload data
      window.location.reload();
    },
    threshold: 80,
  });
  
  // Monitor performance budget
  usePerformanceBudget();

  // Fetch confessions for the feed
  const { confessions, isLoading: loadingConfessions } = useConfessions({
    sortBy: 'popular',
    limit: 30
  });

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
        className="w-full min-h-screen pb-24"
      >
        {/* Premium Header Pill */}
        {user && (
          <div className="sticky top-0 z-40 glass-strong border-b border-border/30 backdrop-blur-xl animate-fade-in">
            <div className="max-w-2xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between gap-4 px-6 py-3 rounded-full bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border border-primary/20 shadow-lg shadow-primary/10 transition-all duration-300 hover:shadow-xl hover:shadow-primary/20">
                <h1 className="text-lg font-bold text-foreground">
                  Confess<span className="text-primary">AI</span>
                </h1>
                <button
                  onClick={() => {
                    setDialogDefaultTab('coins');
                    setManageSubDialogOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-background/60 rounded-full border border-border/50 hover:bg-background/80 transition-all hover:scale-105"
                >
                  <span className="text-base">🪙</span>
                  <span className="text-sm font-semibold text-foreground">{balance}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feed Container */}
        <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {/* Section Title */}
          <h2 className="text-lg font-bold text-foreground mb-5 px-2">
            {t.popular_confessions}
          </h2>

          {/* Confession Feed */}
          <ConfessionFeed
            confessions={confessions}
            isLoading={loadingConfessions}
            isVip={isVip}
            likedConfessions={new Set()}
            bookmarkedConfessions={new Set()}
            onUpgradeClick={() => {
              setDialogDefaultTab('subscriptions');
              setManageSubDialogOpen(true);
            }}
            onInsightGenerated={() => {}}
            onLikeChange={() => {}}
            onCommentChange={() => {}}
            onBookmarkChange={() => {}}
            onNewConfession={handleNewConfession}
          />
        </div>
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
