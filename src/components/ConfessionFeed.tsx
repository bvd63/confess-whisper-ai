import { memo } from "react";
import ConfessionCard from "./ConfessionCard";
import { ConfessionCardSkeleton } from "./skeletons/ConfessionCardSkeleton";
import EmptyState from "./EmptyState";
import { Heart } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import VirtualizedConfessions from "@/components/VirtualizedConfessions";

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
}

interface ConfessionFeedProps {
  confessions: Confession[];
  isLoading: boolean;
  isVip: boolean;
  likedConfessions: Set<string>;
  bookmarkedConfessions: Set<string>;
  onReport?: (id: string) => void;
  onUpgradeClick: () => void;
  onInsightGenerated: () => void;
  onLikeChange: () => void;
  onCommentChange: () => void;
  onBookmarkChange: () => void;
  onNewConfession?: () => void;
}

const ConfessionFeed = memo(({
  confessions,
  isLoading,
  isVip,
  likedConfessions,
  bookmarkedConfessions,
  onReport,
  onUpgradeClick,
  onInsightGenerated,
  onLikeChange,
  onCommentChange,
  onBookmarkChange,
  onNewConfession,
}: ConfessionFeedProps) => {
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
        <ConfessionCardSkeleton />
        <ConfessionCardSkeleton />
        <ConfessionCardSkeleton />
        <ConfessionCardSkeleton />
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

  // Use virtual scrolling for large lists
  if (confessions.length > 15) {
    return (
      <VirtualizedConfessions
        confessions={confessions}
        isVip={isVip}
        onUpgradeClick={onUpgradeClick}
        onInsightGenerated={onInsightGenerated}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
      {confessions.map((confession) => (
        <ConfessionCard
          key={confession.id}
          confession={confession}
          isVip={isVip}
          isLiked={likedConfessions.has(confession.id)}
          isBookmarked={bookmarkedConfessions.has(confession.id)}
          onReport={onReport}
          onUpgradeClick={onUpgradeClick}
          onInsightGenerated={onInsightGenerated}
          onLikeChange={onLikeChange}
          onCommentChange={onCommentChange}
          onBookmarkChange={onBookmarkChange}
        />
      ))}
    </div>
  );
});

ConfessionFeed.displayName = "ConfessionFeed";

export default ConfessionFeed;
