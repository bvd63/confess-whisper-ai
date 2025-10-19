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

const NewConfessionDialog = lazy(() => import("@/components/NewConfessionDialog"));
const PremiumDialog = lazy(() => import("@/components/PremiumDialog"));

const Following = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, isLoading } = useCurrentUser();
  useAnalyticsTracking(user?.id || null);
  const { isPremium } = usePremiumStatus(user?.id);
  const [isNewConfessionOpen, setIsNewConfessionOpen] = useState(false);
  const [isPremiumDialogOpen, setIsPremiumDialogOpen] = useState(false);

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
      onUpgradeClick={() => setIsPremiumDialogOpen(true)}
    >
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-4xl pb-24">
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
        <PremiumDialog
          open={isPremiumDialogOpen}
          onOpenChange={setIsPremiumDialogOpen}
          onUpgrade={async () => {}}
        />
      </Suspense>
    </AppLayout>
  );
};

export default Following;