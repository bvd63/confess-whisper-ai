import { useState, useEffect, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { GradientText } from "@/components/GradientText";

import { Bookmark } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import ConfessionCard from "@/components/ConfessionCard";
import ConfessionSkeleton from "@/components/ConfessionSkeleton";
import EmptyState from "@/components/EmptyState";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useConfessionInteractions } from "@/hooks/useConfessionInteractions";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";
import { InstagramBottomNav } from "@/components/InstagramBottomNav";
import { UnifiedShopDialog } from "@/components/UnifiedShopDialog";
import VirtualizedConfessions from "@/components/VirtualizedConfessions";

const NewConfessionDialog = lazy(() => import("@/components/NewConfessionDialog"));


interface Confession {
  id: string;
  content: string;
  category: string;
  user_id?: string | null;
  comments_count?: number;
  likes_count?: number;
  ai_response?: string | null;
  ai_deep_insight?: string | null;
  created_at: string;
  is_anonymous?: boolean;
  author_display_name_snapshot?: string | null;
}

const Bookmarks = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, isLoading: userLoading } = useCurrentUser();
  useAnalyticsTracking(user?.id || null);
  const { isPremium } = usePremiumStatus(user?.id);
  const { likedConfessions, bookmarkedConfessions, reloadLikes, reloadBookmarks } = useConfessionInteractions({ userId: user?.id || null });
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewConfessionOpen, setIsNewConfessionOpen] = useState(false);
  
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Wait for user loading to complete
    if (userLoading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }
    loadBookmarkedConfessions();
  }, [user, userLoading]);

  const loadBookmarkedConfessions = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Get bookmarked confession IDs
      const { data: bookmarks, error: bookmarksError } = await supabase
        .from('bookmarks')
        .select('confession_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (bookmarksError) throw bookmarksError;

      const confessionIds = bookmarks?.map(b => b.confession_id) || [];

      if (confessionIds.length === 0) {
        setConfessions([]);
        setIsLoading(false);
        return;
      }

      // Get the confessions
      const { data: confessionsData, error: confessionsError } = await supabase
        .from('confessions')
        .select('*')
        .in('id', confessionIds);

      if (confessionsError) throw confessionsError;

      // Sort by bookmark order
      const sorted = confessionIds
        .map(id => confessionsData?.find(c => c.id === id))
        .filter(Boolean) as Confession[];

      setConfessions(sorted);
    } catch (error) {
      console.error('Error loading bookmarked confessions:', error);
      toast({
        title: t.error_generic,
        description: t.error_load,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReport = async (id: string) => {
    try {
      const { error } = await supabase
        .from('confessions')
        .update({ is_reported: true })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: t.success_reported,
        description: t.success_reported,
      });
    } catch (error) {
      console.error('Error reporting confession:', error);
      toast({
        title: t.error_generic,
        description: t.error_generic,
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout 
      onNewConfession={() => setIsNewConfessionOpen(true)}
      onManageSubscription={() => setManageSubDialogOpen(true)}
    >
      <main className="container max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 pb-24">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-4 sm:mb-6 animate-fade-in">
          <Bookmark className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-pulse-glow" />
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            <GradientText variant="hero">{t.bookmarks_title}</GradientText>
          </h1>
        </div>
        {isLoading ? (
          <div className="space-y-4 sm:space-y-5">
            <ConfessionSkeleton />
            <ConfessionSkeleton />
            <ConfessionSkeleton />
          </div>
        ) : confessions.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title={t.bookmarks_none}
            description={t.bookmarks_none}
            actionLabel={t.common_back}
            onAction={() => navigate('/')}
          />
        ) : confessions.length > 15 ? (
          <VirtualizedConfessions
            confessions={confessions}
            isPremium={isPremium}
            onUpgradeClick={() => {}}
            onInsightGenerated={loadBookmarkedConfessions}
          />
        ) : (
          <div className="space-y-4">
            {confessions.map((confession) => (
              <ConfessionCard
                key={confession.id}
                confession={confession}
                isPremium={isPremium}
                isLiked={likedConfessions.has(confession.id)}
                isBookmarked={bookmarkedConfessions.has(confession.id)}
                onReport={handleReport}
                onUpgradeClick={() => {}}
                onInsightGenerated={loadBookmarkedConfessions}
                onLikeChange={reloadLikes}
                onCommentChange={loadBookmarkedConfessions}
                onBookmarkChange={reloadBookmarks}
              />
            ))}
          </div>
        )}
      </main>

      <InstagramBottomNav />

      <Suspense fallback={null}>
        <NewConfessionDialog
          open={isNewConfessionOpen}
          onOpenChange={setIsNewConfessionOpen}
          onConfessionCreated={loadBookmarkedConfessions}
        />
      </Suspense>

      <UnifiedShopDialog
        open={manageSubDialogOpen}
        onOpenChange={setManageSubDialogOpen}
      />
    </AppLayout>
  );
};

export default Bookmarks;