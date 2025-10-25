import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import ConfessionCard from "./ConfessionCard";
import { LoadingQuotes } from "./LoadingQuotes";
import ErrorMessage from "./ErrorMessage";
import { useConfessionInteractions } from "@/hooks/useConfessionInteractions";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import VirtualizedConfessions from "@/components/VirtualizedConfessions";

interface FollowingFeedProps {
  userId: string;
  isPremium: boolean;
  onUpgradeClick: () => void;
}

const FollowingFeed = ({ userId, isPremium, onUpgradeClick }: FollowingFeedProps) => {
  const [confessions, setConfessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { likedConfessions, bookmarkedConfessions, reloadLikes, reloadBookmarks } = useConfessionInteractions({ userId });
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    loadFollowingConfessions();
  }, [userId]);

  const loadFollowingConfessions = async () => {
    try {
      // Get list of users the current user is following
      const { data: following, error: followError } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (followError) throw followError;

      if (!following || following.length === 0) {
        setConfessions([]);
        setLoading(false);
        return;
      }

      const followingIds = following.map(f => f.following_id);

      // Get confessions from followed users
      const { data: confessionsData, error: confError } = await supabase
        .from('confessions')
        .select('*')
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(20);

      if (confError) throw confError;

      setConfessions(confessionsData || []);
    } catch (err) {
      console.error('Error loading following feed:', err);
      setError(t.following_load_error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingQuotes />;
  }

  if (error) {
    return (
      <ErrorMessage 
        message={error}
        onRetry={loadFollowingConfessions}
      />
    );
  }

  if (confessions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t.following_feed_start}</h3>
        <p className="text-sm text-muted-foreground">
          {t.following_start_following}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">{t.following_feed_start}</h2>
        <span className="text-sm text-muted-foreground">
          ({confessions.length} {t.following_count_confessions})
        </span>
      </div>

      {confessions.length > 15 ? (
        <VirtualizedConfessions
          confessions={confessions}
          isPremium={isPremium}
          onUpgradeClick={onUpgradeClick}
          onInsightGenerated={loadFollowingConfessions}
        />
      ) : (
        confessions.map((confession) => (
          <ConfessionCard
            key={confession.id}
            confession={confession}
            isPremium={isPremium}
            isLiked={likedConfessions.has(confession.id)}
            isBookmarked={bookmarkedConfessions.has(confession.id)}
            onUpgradeClick={onUpgradeClick}
            onInsightGenerated={loadFollowingConfessions}
            onLikeChange={() => {
              reloadLikes();
              loadFollowingConfessions();
            }}
            onCommentChange={loadFollowingConfessions}
            onBookmarkChange={() => {
              reloadBookmarks();
              loadFollowingConfessions();
            }}
            onReport={async (id: string) => {
              try {
                const { error } = await supabase
                  .from('confessions')
                  .update({ is_reported: true })
                  .eq('id', id);

                if (error) throw error;

                toast({
                  title: t.confession_reported_success,
                  description: t.confession_reported_success,
                });
              } catch (error) {
                console.error('Error reporting:', error);
                toast({
                  title: t.common_error,
                  description: t.confession_report_error,
                  variant: "destructive",
                });
              }
            }}
          />
        ))
      )}
    </div>
  );
};

export default FollowingFeed;