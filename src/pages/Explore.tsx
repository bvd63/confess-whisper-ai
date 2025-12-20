import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, TrendingUp, Clock, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useVipStatus } from "@/hooks/usePremiumStatus";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";
import { UnifiedShopDialog } from "@/components/UnifiedShopDialog";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { attachActiveBoosts } from "@/lib/boosts";
import { TrendingConfessionsCarousel } from "@/components/explore/TrendingConfessionsCarousel";
import { ExploreSearchBar } from "@/components/explore/ExploreSearchBar";
import ExploreConfessionCard from "@/components/explore/ExploreConfessionCard";
import { ConfessionCardSkeleton } from "@/components/skeletons/ConfessionCardSkeleton";

const Explore = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("trending");
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useCurrentUser();
  useAnalyticsTracking(user?.id || null);
  useVipStatus(user?.id);
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);

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
        limit_count: 30,
      });
      if (error) throw error;
      return await attachActiveBoosts(data || []);
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
        .limit(30);
      if (error) throw error;
      return await attachActiveBoosts(data || []);
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
        .limit(30);
      if (error) throw error;
      return await attachActiveBoosts(data || []);
    },
  });

  // Filter confessions based on search query
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

  const filteredHot = useMemo(() => filterConfessions(hotConfessions), [hotConfessions, searchQuery]);
  const filteredRecent = useMemo(() => filterConfessions(recentConfessions), [recentConfessions, searchQuery]);
  const filteredPopular = useMemo(() => filterConfessions(popularConfessions), [popularConfessions, searchQuery]);

  // Check if database has any confessions at all
  const hasAnyConfessions = useMemo(() => {
    return (hotConfessions?.length || 0) + (recentConfessions?.length || 0) + (popularConfessions?.length || 0) > 0;
  }, [hotConfessions, recentConfessions, popularConfessions]);

  // Smart tab fallback: if current tab is empty, switch to one with results
  const isLoading = loadingHot || loadingRecent || loadingPopular;
  
  useEffect(() => {
    if (isLoading || searchQuery) return;
    
    const getCurrentTabData = () => {
      if (activeTab === "trending") return filteredHot;
      if (activeTab === "popular") return filteredPopular;
      return filteredRecent;
    };
    
    const currentData = getCurrentTabData();
    
    // If current tab is empty, try to find a tab with data
    if (currentData.length === 0 && hasAnyConfessions) {
      if (activeTab !== "trending" && filteredHot.length > 0) {
        setActiveTab("trending");
      } else if (activeTab !== "popular" && filteredPopular.length > 0) {
        setActiveTab("popular");
      } else if (activeTab !== "recent" && filteredRecent.length > 0) {
        setActiveTab("recent");
      }
    }
  }, [activeTab, filteredHot, filteredPopular, filteredRecent, isLoading, hasAnyConfessions, searchQuery]);

  const renderConfessions = (confessions: any[], loading: boolean) => {
    if (loading) {
      return (
        <div className="space-y-2">
          <ConfessionCardSkeleton />
          <ConfessionCardSkeleton />
          <ConfessionCardSkeleton />
        </div>
      );
    }

    // Only show empty state if there are truly no confessions in the entire database
    if (confessions.length === 0 && !hasAnyConfessions) {
      return (
        <div className="flex flex-col items-center justify-center py-10 px-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/60 via-primary/50 to-accent/60 flex items-center justify-center mb-3 shadow-lg shadow-primary/20">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-white/60 text-center">{t.explore_no_confessions}</p>
        </div>
      );
    }

    // If this specific tab is empty but others have data, show nothing (tab will auto-switch)
    if (confessions.length === 0) {
      return null;
    }

    return (
      <div className="space-y-2">
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
              <Loader2 className={`h-5 w-5 text-primary ${isRefreshing || isTriggered ? "animate-spin" : ""}`} />
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className="container max-w-2xl mx-auto px-4 sm:px-5 py-4 pb-24 space-y-3"
        >
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
            <div className="sticky top-14 z-40 bg-background/80 backdrop-blur-md py-2 -mx-4 px-4 sm:-mx-5 sm:px-5">
              <TabsList className="grid w-full grid-cols-3 h-11 rounded-xl bg-white/5 border border-white/10">
                <TabsTrigger
                  value="trending"
                  className="gap-2 text-sm rounded-lg text-white/60 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/80 data-[state=active]:to-accent/80 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <Flame className="w-4 h-4" />
                  <span className="hidden xs:inline">{t.search_trending}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="popular"
                  className="gap-2 text-sm rounded-lg text-white/60 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/80 data-[state=active]:to-accent/80 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span className="hidden xs:inline">{t.ui_popular}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="recent"
                  className="gap-2 text-sm rounded-lg text-white/60 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/80 data-[state=active]:to-accent/80 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <Clock className="w-4 h-4" />
                  <span className="hidden xs:inline">{t.ui_recent}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="trending" className="mt-2">
              {renderConfessions(filteredHot, loadingHot)}
            </TabsContent>

            <TabsContent value="popular" className="mt-2">
              {renderConfessions(filteredPopular, loadingPopular)}
            </TabsContent>

            <TabsContent value="recent" className="mt-2">
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
