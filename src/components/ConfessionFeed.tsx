import { memo } from "react";
import { memo } from "react";
import EmptyState from "./EmptyState";
import { Heart } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import HomeFeedCard from "./HomeFeedCard";

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
  boost_expires_at?: string | null;
  author_nickname_snapshot?: string | null;
  author_visibility_snapshot?: string | null;
  author_display_name_snapshot?: string | null;
  is_anonymous?: boolean;
}

interface ConfessionFeedProps {
  confessions: Confession[];
  isLoading: boolean;
  currentUserId?: string | null;
  onNewConfession?: () => void;
}

const FeedCardSkeleton = () => (
  <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#1c1343]/60 via-[#0b0d1f]/60 to-[#05060f]/60 p-6 animate-pulse h-[220px]" />
);

const ConfessionFeed = memo(({
  confessions,
  isLoading,
  currentUserId,
  onNewConfession,
}: ConfessionFeedProps) => {
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <FeedCardSkeleton />
        <FeedCardSkeleton />
        <FeedCardSkeleton />
      </div>
    );
  }

  if (confessions.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title={t.index_no_confessions_title}
        description={t.index_no_confessions_desc}
        actionLabel={t.new_confession}
        onAction={onNewConfession}
      />
    );
  }

  return (
    <div className="space-y-4">
      {confessions.map((confession) => (
        <HomeFeedCard
          key={confession.id}
          confession={confession}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
});

ConfessionFeed.displayName = "ConfessionFeed";

export default ConfessionFeed;
