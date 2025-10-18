import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import ConfessionCard from "@/components/ConfessionCard";
import { AnimatedCard } from "@/components/AnimatedCard";
import { GradientText } from "@/components/GradientText";
import { FloatingElement } from "@/components/FloatingElement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Flame, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import { InstagramBottomNav } from "@/components/InstagramBottomNav";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";
import { useToast } from "@/hooks/use-toast";

const Explore = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("trending");
  const { user } = useCurrentUser();
  useAnalyticsTracking(user?.id || null);
  const { isPremium } = usePremiumStatus(user?.id);
  const { toast } = useToast();

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
    <AppLayout>
      <div className="container max-w-4xl mx-auto px-4 py-8 pb-24">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold mb-2">
            <GradientText variant="hero">{t.explore}</GradientText>
          </h1>
          <p className="text-muted-foreground">{t.recommended_for_you}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="trending" className="gap-2">
              <Flame className="w-4 h-4" />
              {t.search_trending}
            </TabsTrigger>
            <TabsTrigger value="popular" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              {t.ui_popular}
            </TabsTrigger>
            <TabsTrigger value="recent" className="gap-2">
              <Clock className="w-4 h-4" />
              {t.ui_recent}
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
  );
};

export default Explore;
