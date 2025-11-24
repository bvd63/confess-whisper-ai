import { AnimatedCard } from "@/components/AnimatedCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, Lock, Globe } from "lucide-react";
import { useCommunityMembers } from "@/hooks/useCommunities";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { memo } from "react";

interface CommunityCardProps {
  community: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    icon: string | null;
    member_count: number;
    post_count: number;
    is_private: boolean;
    language: string | null;
  };
}

export const CommunityCard = ({ community }: CommunityCardProps) => {
  const navigate = useNavigate();
  const { isMember, isPending, joinCommunity, leaveCommunity, isJoining, isLeaving } = 
    useCommunityMembers(community.id);
  const { t } = useLanguage();

  const handleToggleMembership = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMember) {
      leaveCommunity();
    } else if (!isPending) {
      joinCommunity(community.is_private || false);
    }
  };

  const getButtonText = () => {
    if (isPending) return t.communities_pending;
    if (isMember) return t.communities_leave;
    return community.is_private ? t.communities_request_join : t.communities_join;
  };

  return (
    <AnimatedCard
      hover="lift"
      glass
      className="p-2 cursor-pointer"
      onClick={() => navigate(`/community/${community.id}`)}
    >
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm">
            {community.icon || "✨"}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <h3 className="font-semibold text-xs text-foreground">{community.name}</h3>
              {community.is_private ? (
                <Lock className="w-2.5 h-2.5 text-muted-foreground" />
              ) : (
                <Globe className="w-2.5 h-2.5 text-muted-foreground" />
              )}
            </div>
            <div className="flex gap-1 mt-0.5">
              <Badge variant="outline" className="text-[10px] h-4 px-1">
                {community.category}
              </Badge>
              {community.is_private && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                  {t.communities_private}
                </Badge>
              )}
              {community.language && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1 uppercase">
                  {community.language}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant={isMember ? "outline" : isPending ? "ghost" : "default"}
          onClick={handleToggleMembership}
          disabled={isJoining || isLeaving || isPending}
          className="h-6 text-[10px] px-1.5 shrink-0"
        >
          {getButtonText()}
        </Button>
      </div>

      {community.description && (
        <p className="text-[10px] text-muted-foreground mb-1.5 line-clamp-2">
          {community.description}
        </p>
      )}

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-0.5">
          <Users className="w-2.5 h-2.5" />
          <span>{community.member_count.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <MessageSquare className="w-2.5 h-2.5" />
          <span>{community.post_count.toLocaleString()}</span>
        </div>
      </div>
    </AnimatedCard>
  );
};

export default memo(CommunityCard);
