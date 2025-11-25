import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { GradientText } from "@/components/GradientText";
import { Sparkles, TrendingUp, Bell } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import AppLayout from "@/components/AppLayout";
import DailyPrompt from "@/components/DailyPrompt";
import Leaderboard from "@/components/Leaderboard";
import { QuoteOfTheDay } from "@/components/QuoteOfTheDay";
import QuoteOfTheDaySkeleton from "@/components/QuoteOfTheDaySkeleton";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/useAnalytics";
import StreakCounter from "@/components/StreakCounter";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useMessageNotifications } from "@/hooks/useMessageNotifications";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useSubscriptionCheck } from "@/hooks/useSubscriptionCheck";
import SEOHead from "@/components/SEOHead";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePerformanceBudget } from "@/hooks/usePerformanceBudget";
import { UnifiedShopDialog } from "@/components/UnifiedShopDialog";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { OneSignalBanner } from "@/components/OneSignalBanner";
import { oneSignalBannerI18n } from "@/i18n/onesignal";
import { requestNotificationPermission } from "@/services/onesignal";


import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Lazy load heavy components
const NewConfessionDialog = lazy(() => import("@/components/NewConfessionDialog"));

const OnboardingDialog = lazy(() => import("@/components/OnboardingDialog"));
const TrustBadges = lazy(() => import("@/components/TrustBadges"));
const FAQ = lazy(() => import("@/components/FAQ"));

const Index = () => {
  const navigate = useNavigate();
  const { trackEvent } = useAnalytics();
  const { t, language } = useLanguage();
  const { user } = useCurrentUser();
  const { isPremium } = usePremiumStatus(user?.id);
  useSubscriptionCheck(user?.id);
  useMessageNotifications({ userId: user?.id });
  const [isNewConfessionOpen, setIsNewConfessionOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);
  const [dialogDefaultTab, setDialogDefaultTab] = useState<'subscriptions' | 'coins'>('subscriptions');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSecondaryContent, setShowSecondaryContent] = useState(false);
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

  useEffect(() => {
    // Track page view
    trackEvent('page_view', { page: 'index' });
    
    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }
    
    // Check if banner was dismissed
    const dismissed = localStorage.getItem('onesignal-banner-dismissed') === 'true';
    setBannerDismissed(dismissed);
    
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

    // Stagger secondary content loading for better perceived performance
    const timer = setTimeout(() => setShowSecondaryContent(true), 300);
    return () => clearTimeout(timer);
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
        className="container max-w-2xl mx-auto px-4 py-6"
      >
        {/* OneSignal Notification Banner */}
        {user && !bannerDismissed && (
          <div className="mb-4 sm:mb-6">
            <OneSignalBanner
              permission={notificationPermission}
              onEnable={async () => {
                const granted = await requestNotificationPermission();
                if (granted) {
                  setNotificationPermission('granted');
                  toast({
                    title: t.common_success,
                    description: "Notifications enabled successfully",
                  });
                }
              }}
              onDismiss={() => {
                localStorage.setItem('onesignal-banner-dismissed', 'true');
                setBannerDismissed(true);
              }}
              i18n={oneSignalBannerI18n[language as 'en' | 'es' | 'de'] || oneSignalBannerI18n.en}
            />
          </div>
        )}

        {/* Welcome Section */}
        <div className="mb-8 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2.5 mb-4 px-4 py-2 glass rounded-full border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-semibold">{t.anonymous_secure}</span>
          </div>
          <h2 className="text-3xl font-bold mb-3 px-4">
            <GradientText variant="hero">
              {t.home_title}
            </GradientText>
          </h2>
          <p className="text-base text-muted-foreground max-w-lg mx-auto px-4">
            {t.welcome_description}
          </p>
        </div>


        {/* Quote of the Day */}
        {user && (
          <Suspense fallback={<QuoteOfTheDaySkeleton />}>
            <QuoteOfTheDay />
          </Suspense>
        )}

        {/* Daily Prompt */}
        {user && <DailyPrompt onOpenNewConfession={handleNewConfession} />}

        {/* Leaderboard */}
        {showSecondaryContent && (
          <div className="my-6">
            <Leaderboard />
          </div>
        )}

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
      
      {/* FAQ Section with Suspense */}
      <Suspense fallback={
        <div className="mt-16 animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3 mx-auto" />
          <div className="h-32 bg-muted rounded" />
        </div>
      }>
        <div id="faq-section" className="mt-16">
          <FAQ />
        </div>
      </Suspense>

      {/* Footer with trust badges */}
      <Suspense fallback={
        <div className="mt-16 h-64 bg-muted/20 rounded animate-pulse" />
      }>
        <footer className="mt-16">
          <TrustBadges />
        
        <div className="text-center py-6 border-t border-border/50">
          <div className="flex justify-center gap-4 sm:gap-6 text-sm text-muted-foreground">
            <button
              onClick={() => navigate('/privacy')}
              className="hover:text-primary transition-colors"
            >
              {t.privacy_policy}
            </button>
            <button
              onClick={() => navigate('/terms')}
              className="hover:text-primary transition-colors"
            >
              {t.terms_of_service}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            © 2025 {t.app_name}. {t.all_rights_reserved}
          </p>
        </div>
      </footer>
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
