import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { GradientText } from "@/components/GradientText";
import { Sparkles, Flame, TrendingUp, Bell } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import AppLayout from "@/components/AppLayout";
import FeatureHighlight from "@/components/FeatureHighlight";
import DailyPrompt from "@/components/DailyPrompt";
import Leaderboard from "@/components/Leaderboard";
import { QuoteOfTheDay } from "@/components/QuoteOfTheDay";
import QuoteOfTheDaySkeleton from "@/components/QuoteOfTheDaySkeleton";
import { CommunitiesSectionExpanded } from "@/components/CommunitiesSectionExpanded";
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
import { ManageSubscriptionDialog } from "@/components/ManageSubscriptionDialog";
import { StreakDisplay } from "@/components/StreakDisplay";
import StreakReminder from "@/components/StreakReminder";
import { Card } from "@/components/ui/card";
import { useStreakManager } from "@/hooks/useStreakManager";
import { supabase } from "@/integrations/supabase/client";

import { RateLimitIndicator } from "@/components/RateLimitIndicator";
import { useConfessionRateLimit } from "@/hooks/useConfessionRateLimit";
import { QuickActions } from "@/components/QuickActions";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Loader2 } from "lucide-react";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { Button } from "@/components/ui/button";

// Lazy load heavy components
const NewConfessionDialog = lazy(() => import("@/components/NewConfessionDialog"));

const OnboardingDialog = lazy(() => import("@/components/OnboardingDialog"));
const TrustBadges = lazy(() => import("@/components/TrustBadges"));
const FAQ = lazy(() => import("@/components/FAQ"));

const Index = () => {
  const navigate = useNavigate();
  const { trackEvent } = useAnalytics();
  const { t } = useLanguage();
  const { user } = useCurrentUser();
  const { isPremium } = usePremiumStatus(user?.id);
  useSubscriptionCheck(user?.id);
  useMessageNotifications({ userId: user?.id });
  const [isNewConfessionOpen, setIsNewConfessionOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSecondaryContent, setShowSecondaryContent] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { isLimited, remainingRequests, totalRequests, getRemainingTime } = useConfessionRateLimit();
  const { streakData } = useStreakManager();
  
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
    }
    
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
              title: t.success || 'Success',
              description: `VIP Activated! You received ${response.data.awarded} coins! 🎉`,
            });
          } else {
            toast({
              title: t.success || 'Success',
              description: 'VIP Activated! Welcome to premium features.',
            });
          }
        } catch (error) {
          // Even if coin award fails, show success for VIP activation
          toast({
            title: t.success || 'Success',
            description: 'VIP Activated! Welcome to premium features.',
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
        onManageSubscription={() => setManageSubDialogOpen(true)}
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
        className="container max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8"
      >
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-3 sm:mb-4 px-3 sm:px-4 py-1.5 sm:py-2 glass rounded-full border border-primary/20">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
            <span className="text-xs sm:text-sm text-primary font-medium">{t.anonymous_secure}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 px-4">
            <GradientText variant="hero">
              {t.home_title}
            </GradientText>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto px-4">
            {t.welcome_description}
          </p>
        </div>

        {/* Streak Reminder */}
        {user && <StreakReminder userId={user.id} />}

        {/* Smart Banner for Disabled Notifications */}
        {notificationPermission !== 'granted' && (
          <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400/40 text-sm text-yellow-800 dark:text-yellow-300 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 animate-fade-in">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">{t.notifications_disabled}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/settings/notifications')}
              className="border-yellow-400/40 hover:bg-yellow-400/10 text-yellow-800 dark:text-yellow-300 whitespace-nowrap"
            >
              {t.enable_now}
            </Button>
          </div>
        )}

        {/* Streak Display Card */}
        {user && streakData && (streakData.currentStreak > 0 || streakData.longestStreak > 0) && (
          <Card className="p-4 mb-6 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-full">
                  <Flame className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {streakData.currentStreak} Day Streak 🔥
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Best: {streakData.longestStreak} days
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Streak Display & Counter */}
        {user && (
          <div className="space-y-4 mb-4">
            <StreakDisplay />
            <StreakCounter userId={user.id} variant="full" />
          </div>
        )}


        {/* VIP Upgrade Card - Show only if not VIP */}
        {user && !isPremium && (
          <div className="mb-6">
            <SubscriptionCard />
          </div>
        )}

        {/* Rate Limit Indicator */}
        {user && (
          <RateLimitIndicator
            remaining={remainingRequests}
            total={totalRequests}
            resetTime={getRemainingTime()}
            isLimited={isLimited}
            className="mb-4"
          />
        )}

        {/* Quote of the Day */}
        {user && (
          <Suspense fallback={<QuoteOfTheDaySkeleton />}>
            <QuoteOfTheDay />
          </Suspense>
        )}

        {/* Daily Prompt */}
        {user && <DailyPrompt onOpenNewConfession={handleNewConfession} />}


        {/* Communities Section */}
        {showSecondaryContent && <CommunitiesSectionExpanded />}

        {/* Leaderboard */}
        {showSecondaryContent && (
          <div className="my-4 sm:my-6">
            <Leaderboard />
          </div>
        )}

        {/* Feature Highlights */}
        {showSecondaryContent && (
          <FeatureHighlight />
        )}

      </main>

      {/* Dialogs with Suspense for lazy loading */}
      <Suspense fallback={null}>
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
      <Suspense fallback={null}>
        <div id="faq-section" className="mt-16">
          <FAQ />
        </div>
      </Suspense>

      {/* Footer with trust badges */}
      <Suspense fallback={null}>
        <footer className="mt-16">
          <TrustBadges />
        
        <div className="text-center py-6 border-t border-border/50">
          <div className="flex justify-center gap-6 text-sm text-muted-foreground">
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

      <ManageSubscriptionDialog
        open={manageSubDialogOpen}
        onOpenChange={setManageSubDialogOpen}
      />

      {/* Quick Actions FAB */}
      {user && (
        <QuickActions
          onNewConfession={handleNewConfession}
          onOpenDrafts={() => navigate('/compose')}
          onScrollToTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        />
      )}
      
      </AppLayout>
    </>
  );
};

export default Index;
