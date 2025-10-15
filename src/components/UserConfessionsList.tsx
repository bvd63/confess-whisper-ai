import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/i18n/translations";
import ConfessionCard from "@/components/ConfessionCard";
import ConfessionSkeleton from "@/components/ConfessionSkeleton";
import EmptyState from "@/components/EmptyState";
import { BookMarked } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Confession = Tables<"confessions">;

const UserConfessionsList = () => {
  const { t } = useLanguage();
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [userBookmarks, setUserBookmarks] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUserConfessions();
    fetchUserLikes();
    fetchUserBookmarks();
  }, []);

  const fetchUserConfessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("confessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setConfessions(data || []);
    } catch (error) {
      console.error("Error fetching user confessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLikes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_likes")
        .select("confession_id")
        .eq("user_id", user.id);

      setUserLikes(new Set(data?.map(like => like.confession_id) || []));
    } catch (error) {
      console.error("Error fetching user likes:", error);
    }
  };

  const fetchUserBookmarks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("bookmarks")
        .select("confession_id")
        .eq("user_id", user.id);

      setUserBookmarks(new Set(data?.map(bookmark => bookmark.confession_id) || []));
    } catch (error) {
      console.error("Error fetching user bookmarks:", error);
    }
  };

  const handleLikeChange = () => {
    fetchUserLikes();
    fetchUserConfessions();
  };

  const handleCommentChange = () => {
    fetchUserConfessions();
  };

  const handleBookmarkChange = () => {
    fetchUserBookmarks();
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
        icon={BookMarked}
        title={t.profile_empty_state}
        description={t.profile_empty_description}
      />
    );
  }

  return (
    <div className="space-y-6">
      {confessions.map((confession) => (
        <ConfessionCard
          key={confession.id}
          confession={confession}
          isPremium={false}
          isLiked={userLikes.has(confession.id)}
          isBookmarked={userBookmarks.has(confession.id)}
          onReport={() => {}}
          onUpgradeClick={() => {}}
          onInsightGenerated={fetchUserConfessions}
          onLikeChange={handleLikeChange}
          onCommentChange={handleCommentChange}
          onBookmarkChange={handleBookmarkChange}
        />
      ))}
    </div>
  );
};

export default UserConfessionsList;
