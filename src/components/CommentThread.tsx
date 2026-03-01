import { memo } from "react";
import { Shield, User as UserIcon, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sanitizeComment } from "@/lib/security/sanitizer";

interface ReplyComment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  alias?: string | null;
  is_anonymous?: boolean;
  parent_comment_id?: string | null;
  profiles?: {
    nickname?: string | null;
    subscription_tier?: string | null;
  };
}

interface CommentThreadProps {
  replies: ReplyComment[];
  currentUserId: string | null;
  parentCommentId: string;
  onSetReplyTarget: (target: { id: string; displayName: string }) => void;
  timeAgo: (date: string) => string;
}

const CommentThread = ({
  replies,
  currentUserId,
  parentCommentId,
  onSetReplyTarget,
  timeAgo,
}: CommentThreadProps) => {
  if (replies.length === 0) return null;

  return (
    <div className="ml-5 mt-1 relative">
      {/* Thread connector line */}
      <div className="absolute left-0 top-2 bottom-2 w-px bg-white/10 rounded-full" />

      <div className="pl-4 space-y-1.5 pt-1.5 pb-0.5">
        {replies.map((reply) => {
          const isAnonymousReply = reply.is_anonymous !== false;
          const displayName = isAnonymousReply
            ? (reply.alias || "Anonymous")
            : `@${reply.profiles?.nickname || "User"}`;
          const isVip =
            !isAnonymousReply &&
            (reply.profiles?.subscription_tier || "").toLowerCase() === "vip";

          return (
            <div
              key={reply.id}
              className="relative p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm transition-all duration-200 hover:bg-white/[0.06]"
            >
              <p className="text-sm text-white/85 leading-relaxed mb-2 break-words">
                {sanitizeComment(reply.content)}
              </p>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                      isAnonymousReply
                        ? "bg-white/10 text-white/70"
                        : "bg-primary/20 text-primary"
                    )}
                  >
                    {isAnonymousReply ? (
                      <Shield className="w-2.5 h-2.5" />
                    ) : (
                      <UserIcon className="w-2.5 h-2.5" />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-white/80 truncate">
                    {displayName}
                  </span>
                  {isVip && (
                    <span className="text-xs flex-shrink-0" title="VIP">
                      👑
                    </span>
                  )}
                  <span className="text-[11px] text-white/40 flex-shrink-0">
                    · {timeAgo(reply.created_at)}
                  </span>
                </div>

                {currentUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onSetReplyTarget({ id: parentCommentId, displayName })
                    }
                    className="h-6 px-2 text-[10px] text-white/40 hover:text-white/70 hover:bg-white/5 rounded-full gap-1 flex-shrink-0 transition-all"
                  >
                    <MessageCircle className="w-2.5 h-2.5" />
                    Reply
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default memo(CommentThread);