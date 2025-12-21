import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, TrendingUp, Clock, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useVipStatus } from "@/hooks/usePremiumStatus";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";
import { UnifiedShopDialog } from "@/components/UnifiedShopDialog";
import { TrendingConfessionsCarousel } from "@/components/explore/TrendingConfessionsCarousel";
import { ExploreSearchBar } from "@/components/explore/ExploreSearchBar";
import ExploreConfessionCard from "@/components/explore/ExploreConfessionCard";
import { ConfessionCardSkeleton } from "@/components/skeletons/ConfessionCardSkeleton";
import {
  fetchPopularConfessions,
  fetchRecentConfessions,
  fetchTrendingConfessions,
} from "@/services/exploreFeedService";

const Explore = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("trending");
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useCurrentUser();
  useAnalyticsTracking(user?.id || null);
  const { isVip } = useVipStatus(user?.id);
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);
  const [showPullToRefresh, setShowPullToRefresh] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const queryClient = useQueryClient();

  // Fetch trending, popular, and recent confessions with scoring and filters
  const { data: trendingResult, isLoading: loadingTrending, refetch: refetchTrending } = useQuery({
    queryKey: ["explore", "trending", user?.id],
    queryFn: () => fetchTrendingConfessions({ currentUserId: user?.id ?? null }),
  });

  const { data: recentResult, isLoading: loadingRecent, refetch: refetchRecent } = useQuery({
    queryKey: ["explore", "recent", user?.id],
    queryFn: () => fetchRecentConfessions({ currentUserId: user?.id ?? null }),
  });

  const { data: popularResult, isLoading: loadingPopular, refetch: refetchPopular } = useQuery({
    queryKey: ["explore", "popular", user?.id],
    queryFn: () => fetchPopularConfessions({ currentUserId: user?.id ?? null }),
  });

  const triggerRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["explore"] });
    await Promise.allSettled([refetchTrending(), refetchPopular(), refetchRecent()]);
  }, [queryClient, refetchTrending, refetchPopular, refetchRecent]);

  // Global pull-to-refresh via window touch events
  useEffect(() => {
    let startY = 0;
    let isPulling = false;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPulling) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;

      setPullDistance(Math.max(0, diff));

      if (diff > 60) {
        setShowPullToRefresh(true);
      }
    };

    const onTouchEnd = async () => {
      if (showPullToRefresh) {
        await triggerRefresh();
      }
      setShowPullToRefresh(false);
      setPullDistance(0);
      isPulling = false;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [showPullToRefresh, triggerRefresh]);

  const filterConfessions = (confessions: any[] | undefined) => {
    if (!confessions) return [];
    if (!searchQuery.trim()) return confessions;
    const query = searchQuery.toLowerCase();
    return confessions.filter(
      (confession) =>
        confession.content.toLowerCase().includes(query) ||
        confession.category.toLowerCase().includes(query)
    );
  };

  const filteredHot = useMemo(() => filterConfessions(trendingResult?.items), [trendingResult, searchQuery]);
  const filteredRecent = useMemo(() => filterConfessions(recentResult?.items), [recentResult, searchQuery]);
  const filteredPopular = useMemo(() => filterConfessions(popularResult?.items), [popularResult, searchQuery]);

  const renderConfessions = (confessions: any[], loading: boolean) => {
    if (loading) {
      return (
        <div className="space-y-3">
          <ConfessionCardSkeleton />
          <ConfessionCardSkeleton />
          <ConfessionCardSkeleton />
        </div>
      );
    }

    if (confessions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 px-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/60 via-primary/50 to-accent/60 flex items-center justify-center mb-3 shadow-lg shadow-primary/20">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-white/60 text-center">{t.explore_no_confessions}</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {confessions.map((confession) => (
          <ExploreConfessionCard key={confession.id} confession={confession} />
        ))}
      </div>
    );
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
              opacity: Math.min(pullDistance / 80, 1),
            }}
          >
            <div className="bg-primary/10 backdrop-blur-sm rounded-full p-2">
              <Loader2 className={`h-5 w-5 text-primary ${showPullToRefresh ? "animate-spin" : ""}`} />
            </div>
          </div>
        )}

        <div className="container max-w-4xl mx-auto px-4 sm:px-5 py-5 pb-28 space-y-4">
          {/* Header */}
          <div className="space-y-1 animate-fade-in">
            <h1 className="text-2xl font-bold text-white">{t.explore}</h1>
            <p className="text-sm text-white/50">{t.explore_subtitle}</p>
          </div>

          {/* Search Bar */}
          <ExploreSearchBar value={searchQuery} onChange={setSearchQuery} />

          {/* Trending Carousel - Only show if not searching */}
          {!searchQuery && <TrendingConfessionsCarousel />}

          {/* Sticky Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="py-2 -mx-4 px-4 sm:-mx-5 sm:px-5">
              <TabsList className="grid w-full grid-cols-3 h-11 bg-transparent p-0 gap-3">
                <TabsTrigger
                  value="trending"
                  className="gap-2 text-sm bg-transparent text-white/60 hover:text-white/80 rounded-full px-6 py-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white data-[state=active]:shadow-[0_0_18px_hsl(var(--primary)/0.35)]"
                >
                  <Flame className="w-4 h-4" />
                  <span className="hidden xs:inline">{t.search_trending}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="popular"
                  className="gap-2 text-sm bg-transparent text-white/60 hover:text-white/80 rounded-full px-6 py-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white data-[state=active]:shadow-[0_0_18px_hsl(var(--primary)/0.35)]"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span className="hidden xs:inline">{t.ui_popular}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="recent"
                  className="gap-2 text-sm bg-transparent text-white/60 hover:text-white/80 rounded-full px-6 py-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white data-[state=active]:shadow-[0_0_18px_hsl(var(--primary)/0.35)]"
                >
                  <Clock className="w-4 h-4" />
                  <span className="hidden xs:inline">{t.ui_recent}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="trending" className="mt-3">
              {renderConfessions(filteredHot, loadingTrending)}
            </TabsContent>

            <TabsContent value="popular" className="mt-3">
              {renderConfessions(filteredPopular, loadingPopular)}
            </TabsContent>

            <TabsContent value="recent" className="mt-3">
              {renderConfessions(filteredRecent, loadingRecent)}
            </TabsContent>
          </Tabs>
        </div>
      </AppLayout>

      <UnifiedShopDialog open={manageSubDialogOpen} onOpenChange={setManageSubDialogOpen} />
    </>
  );
};

export default Explore;
