import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bookmark } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import ConfessionCard from "@/components/ConfessionCard";
import ConfessionSkeleton from "@/components/ConfessionSkeleton";
import ThemeToggle from "@/components/ThemeToggle";
import EmptyState from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useConfessionInteractions } from "@/hooks/useConfessionInteractions";

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
}

const Bookmarks = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useCurrentUser();
  const { likedConfessions, bookmarkedConfessions, reloadLikes, reloadBookmarks } = useConfessionInteractions({ userId: user?.id || null });
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadPremiumStatus();
    loadBookmarkedConfessions();
  }, [user]);

  const loadPremiumStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setIsPremium(data?.is_premium || false);
    } catch (error) {
      console.error('Error checking premium status:', error);
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border/50 shadow-[var(--shadow-soft)]">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Bookmark className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {t.bookmarks_title}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="space-y-6">
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
    </div>
  );
};

export default Bookmarks;