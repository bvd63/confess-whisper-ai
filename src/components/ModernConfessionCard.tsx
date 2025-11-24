import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Bookmark, MoreVertical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ModernConfessionCardProps {
  confession: {
    id: string;
    content: string;
    created_at: string;
    category?: string;
    likes_count?: number;
    comments_count?: number;
    is_anonymous?: boolean;
    author_display_name_snapshot?: string | null;
    author_nickname_snapshot?: string | null;
  };
  isLiked?: boolean;
  isBookmarked?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onBookmark?: () => void;
  onMore?: () => void;
  onClick?: () => void;
  className?: string;
}

/**
 * Modern Instagram/Facebook-style confession card
 * Clean, card-based layout with modern interactions
 */
export const ModernConfessionCard = ({
  confession,
  isLiked,
  isBookmarked,
  onLike,
  onComment,
  onShare,
  onBookmark,
  onMore,
  onClick,
  className
}: ModernConfessionCardProps) => {
  const displayName = confession.is_anonymous 
    ? "Anonymous" 
    : (confession.author_nickname_snapshot || confession.author_display_name_snapshot || "Anonymous");

  const timeAgo = formatDistanceToNow(new Date(confession.created_at), { addSuffix: true });

  return (
    <Card 
      className={cn(
        "glass border border-border hover:shadow-elegant transition-all duration-200 overflow-hidden cursor-pointer group",
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">
              {displayName[0].toUpperCase()}
            </span>
          </div>
          
          {/* User Info */}
          <div>
            <p className="text-sm font-semibold text-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
        </div>

        {/* Category Badge */}
        {confession.category && (
          <Badge variant="secondary" className="text-xs">
            {confession.category}
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap line-clamp-6">
          {confession.content}
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onLike?.();
            }}
            className={cn(
              "h-9 px-3 gap-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors",
              isLiked && "text-red-500"
            )}
          >
            <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
            <span className="text-xs font-medium">{confession.likes_count || 0}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onComment?.();
            }}
            className="h-9 px-3 gap-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs font-medium">{confession.comments_count || 0}</span>
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onShare?.();
            }}
            className="h-9 w-9 p-0 hover:bg-accent"
          >
            <Share2 className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onBookmark?.();
            }}
            className={cn(
              "h-9 w-9 p-0 hover:bg-accent",
              isBookmarked && "text-primary"
            )}
          >
            <Bookmark className={cn("w-4 h-4", isBookmarked && "fill-current")} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onMore?.();
            }}
            className="h-9 w-9 p-0 hover:bg-accent"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};