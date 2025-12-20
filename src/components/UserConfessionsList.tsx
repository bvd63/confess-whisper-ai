import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useConfessionInteractions } from "@/hooks/useConfessionInteractions";
import { useVipStatus } from "@/hooks/usePremiumStatus";
import ConfessionCard from "@/components/ConfessionCard";
import ConfessionSkeleton from "@/components/ConfessionSkeleton";
import EmptyState from "@/components/EmptyState";
import { BookOpen } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import VirtualizedConfessions from "@/components/VirtualizedConfessions";
import { logError } from "@/lib/logger";
import { attachActiveBoosts } from "@/lib/boosts";

type Confession = Tables<"confessions"> & { boost_expires_at?: string | null };

const UserConfessionsList = () => {
  const { t } = useLanguage();
  const { user } = useCurrentUser();
  const { isVip } = useVipStatus(user?.id);
  const { likedConfessions, bookmarkedConfessions, reloadLikes, reloadBookmarks } = useConfessionInteractions({ userId: user?.id || null });
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserConfessions();
    }
  }, [user]);

  const fetchUserConfessions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("confessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const withBoosts = await attachActiveBoosts(data || []);
      setConfessions(withBoosts);
    } catch (error) {
      logError("Error fetching user confessions", error as Error);
    } finally {
      setLoading(false);
    }
  };

  const handleLikeChange = () => {
    reloadLikes();
    fetchUserConfessions();
  };

  const handleCommentChange = () => {
    fetchUserConfessions();
  };

  const handleBookmarkChange = () => {
    reloadBookmarks();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <ConfessionSkeleton />
        <ConfessionSkeleton />
      </div>
    );
  }

  if (confessions.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title={t.profile_empty_state}
        description={t.profile_empty_description}
      />
    );
  }

  if (confessions.length > 15) {
    return (
      <VirtualizedConfessions
        confessions={confessions}
        isVip={isVip}
        onUpgradeClick={() => {}}
        onInsightGenerated={fetchUserConfessions}
      />
    );
  }

  return (
    <div className="space-y-6">
      {confessions.map((confession) => (
        <ConfessionCard
          key={confession.id}
          confession={confession}
          isVip={isVip}
          isLiked={likedConfessions.has(confession.id)}
          isBookmarked={bookmarkedConfessions.has(confession.id)}
          onReport={() => {}}
          onUpgradeClick={() => {}}
          onInsightGenerated={fetchUserConfessions}
          onLikeChange={handleLikeChange}
          onCommentChange={handleCommentChange}
          onBookmarkChange={handleBookmarkChange}
          from="profile_my_confessions"
        />
      ))}
    </div>
  );
};

export default UserConfessionsList;
