import { useNavigate } from "react-router-dom";
import { useEffect, useState, Suspense, lazy } from "react";
import { GradientText } from "@/components/GradientText";

import { Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";
import FollowingFeed from "@/components/FollowingFeed";
import FollowStats from "@/components/FollowStats";
import AppLayout from "@/components/AppLayout";
import { InstagramBottomNav } from "@/components/InstagramBottomNav";
import { UnifiedShopDialog } from "@/components/UnifiedShopDialog";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Loader2 } from "lucide-react";

const NewConfessionDialog = lazy(() => import("@/components/NewConfessionDialog"));


const Following = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, isLoading } = useCurrentUser();
  useAnalyticsTracking(user?.id || null);
  const { isPremium } = usePremiumStatus(user?.id);
  const [isNewConfessionOpen, setIsNewConfessionOpen] = useState(false);
  
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);

  // Pull to refresh
  const { containerRef, isRefreshing, pullDistance, isTriggered } = usePullToRefresh({
    onRefresh: async () => {
      window.location.reload();
    },
    threshold: 80,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout 
      onNewConfession={() => setIsNewConfessionOpen(true)}
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

      <div 
        ref={containerRef}
        className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-4xl pb-24"
      >
        <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8 animate-fade-in">
          <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-pulse-glow" />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            <GradientText variant="hero">{t.following_your_feed}</GradientText>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <FollowingFeed
              userId={user.id}
              isPremium={isPremium}
              onUpgradeClick={() => navigate('/')}
            />
          </div>

          <div className="space-y-6">
            <FollowStats userId={user.id} />
          </div>
        </div>
      </div>

      <InstagramBottomNav />

      <Suspense fallback={null}>
        <NewConfessionDialog
          open={isNewConfessionOpen}
          onOpenChange={setIsNewConfessionOpen}
          onConfessionCreated={() => {}}
        />
      </Suspense>

      <UnifiedShopDialog
        open={manageSubDialogOpen}
        onOpenChange={setManageSubDialogOpen}
      />
    </AppLayout>
  );
};

export default Following;