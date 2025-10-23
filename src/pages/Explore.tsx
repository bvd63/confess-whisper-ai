import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import ConfessionCard from "@/components/ConfessionCard";
import { AnimatedCard } from "@/components/AnimatedCard";
import { GradientText } from "@/components/GradientText";
import { SearchUsersCard } from "@/components/SearchUsersCard";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Flame, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import { InstagramBottomNav } from "@/components/InstagramBottomNav";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";
import { useToast } from "@/hooks/use-toast";
import { useCommunities } from "@/hooks/useCommunities";
import { ManageSubscriptionDialog } from "@/components/ManageSubscriptionDialog";
import { TrendingHashtags } from "@/components/TrendingHashtags";
import { PremiumTeaser } from "@/components/PremiumTeaser";
import { FeatureGate } from "@/components/auth/FeatureGate";
import { QuickActions } from "@/components/QuickActions";
import { useNavigate } from "react-router-dom";
import { AdvancedFilters, FilterState } from "@/components/AdvancedFilters";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Loader2 } from "lucide-react";

const Explore = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("trending");
  const [filters, setFilters] = useState<FilterState>({ sortBy: 'newest' });
  const { user } = useCurrentUser();
  useAnalyticsTracking(user?.id || null);
  const { isPremium } = usePremiumStatus(user?.id);
  const { toast } = useToast();
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);
  const { communities } = useCommunities();

  // Pull to refresh
  const { containerRef, isRefreshing, pullDistance, isTriggered } = usePullToRefresh({
    onRefresh: async () => {
      window.location.reload();
    },
    threshold: 80,
  });

  // Fetch hot/trending confessions
  const { data: hotConfessions, isLoading: loadingHot } = useQuery({
    queryKey: ["hot-confessions"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_hot_confessions", {
        limit_count: 20,
      });
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent confessions
  const { data: recentConfessions, isLoading: loadingRecent } = useQuery({
    queryKey: ["recent-confessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("confessions")
        .select("*")
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Fetch popular confessions (by likes)
  const { data: popularConfessions, isLoading: loadingPopular } = useQuery({
    queryKey: ["popular-confessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("confessions")
        .select("*")
        .eq("moderation_status", "approved")
        .order("likes_count", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const renderConfessions = (confessions: any[] | undefined, loading: boolean) => {
    if (loading) {
      return Array(3)
        .fill(0)
        .map((_, i) => (
          <AnimatedCard key={i} className="p-6" hover="none" delay={i * 100}>
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6" />
          </AnimatedCard>
        ));
    }

    if (!confessions || confessions.length === 0) {
      return (
        <AnimatedCard className="p-8 text-center" hover="none">
          <p className="text-muted-foreground">{t.ui_no_confessions}</p>
        </AnimatedCard>
      );
    }

    return confessions.map((confession) => (
      <ConfessionCard
        key={confession.id}
        confession={confession}
        isPremium={isPremium}
        onUpgradeClick={() => {}}
        onInsightGenerated={() => {
          toast({
            title: t.deep_insight_success,
          });
        }}
      />
    ));
  };

  return (
    <>
    <AppLayout onManageSubscription={() => setManageSubDialogOpen(true)}>
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
        className="container max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 pb-24"
      >
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            <GradientText variant="hero">{t.explore}</GradientText>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">{t.recommended_for_you}</p>
        </div>

        <SearchUsersCard />

        {/* Trending Hashtags - Premium Feature */}
        {user && (
          <div className="mb-6">
            <FeatureGate minTier="premium" teaserPriceHint="$4.99/mo" compact>
              <TrendingHashtags />
            </FeatureGate>
          </div>
        )}
        
        {/* Trending Hashtags - Public for non-logged-in users */}
        {!user && (
          <div className="mb-6">
            <TrendingHashtags />
          </div>
        )}

        {/* Premium Teaser for Free Users */}
        {user && !isPremium && (
          <div className="mb-6">
            <PremiumTeaser
              feature={t.teaser_explore_feature}
              description={t.teaser_explore_description}
              onUpgrade={() => setManageSubDialogOpen(true)}
            />
          </div>
        )}

        {/* Advanced Filters */}
        <AdvancedFilters
          onFilterChange={setFilters}
          communities={communities || []}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6 h-auto">
            <TabsTrigger value="trending" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Flame className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">{t.search_trending}</span>
            </TabsTrigger>
            <TabsTrigger value="popular" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">{t.ui_popular}</span>
            </TabsTrigger>
            <TabsTrigger value="recent" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">{t.ui_recent}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trending" className="space-y-4">
            {renderConfessions(hotConfessions, loadingHot)}
          </TabsContent>

          <TabsContent value="popular" className="space-y-4">
            {renderConfessions(popularConfessions, loadingPopular)}
          </TabsContent>

          <TabsContent value="recent" className="space-y-4">
            {renderConfessions(recentConfessions, loadingRecent)}
          </TabsContent>
        </Tabs>
      </div>
      
      <InstagramBottomNav />
    </AppLayout>
    
    {/* Quick Actions FAB */}
    {user && (
      <QuickActions
        onNewConfession={() => navigate('/compose')}
        onOpenDrafts={() => navigate('/compose')}
        onScrollToTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      />
    )}
    
    <ManageSubscriptionDialog open={manageSubDialogOpen} onOpenChange={setManageSubDialogOpen} />
    </>
  );
};

export default Explore;
