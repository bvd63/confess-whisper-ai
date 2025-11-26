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
}

interface ConfessionFeedProps {
  confessions: Confession[];
  isLoading: boolean;
  isPremium: boolean;
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
  isPremium,
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
      <div className="mx-auto w-full max-w-2xl px-4">
        <div className="space-y-4">
          {[...Array(4)].map((_, index) => (
            <ConfessionCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (confessions.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4">
        <EmptyState
          icon={Heart}
          title={t.index_no_confessions_title}
          description={t.index_no_confessions_desc}
          actionLabel={t.new_confession}
          onAction={onNewConfession}
        />
      </div>
    );
  }

  // Use virtual scrolling for large lists
  if (confessions.length > 15) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4">
        <VirtualizedConfessions
          confessions={confessions}
          isPremium={isPremium}
          onUpgradeClick={onUpgradeClick}
          onInsightGenerated={onInsightGenerated}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      <div className="space-y-4">
        {confessions.map((confession) => (
          <ConfessionCard
            key={confession.id}
            confession={confession}
            isPremium={isPremium}
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
    </div>
  );
});

ConfessionFeed.displayName = "ConfessionFeed";

export default ConfessionFeed;
