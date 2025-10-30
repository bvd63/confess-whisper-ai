import { AnimatedCard } from "@/components/AnimatedCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare } from "lucide-react";
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
  };
}

export const CommunityCard = ({ community }: CommunityCardProps) => {
  const navigate = useNavigate();
  const { isMember, joinCommunity, leaveCommunity, isJoining, isLeaving } = 
    useCommunityMembers(community.id);
  const { t } = useLanguage();

  const handleToggleMembership = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMember) {
      leaveCommunity();
    } else {
      joinCommunity();
    }
  };

  return (
    <AnimatedCard
      hover="lift"
      glass
      className="p-3 cursor-pointer"
      onClick={() => navigate(`/community/${community.id}`)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-lg">
            {community.icon || "🌟"}
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">{community.name}</h3>
            <Badge variant="outline" className="mt-0.5 text-xs">
              {community.category}
            </Badge>
          </div>
        </div>
        <Button
          size="sm"
          variant={isMember ? "outline" : "default"}
          onClick={handleToggleMembership}
          disabled={isJoining || isLeaving}
          className="h-7 text-xs px-2"
        >
          {isMember ? t.communities_leave : t.communities_join}
        </Button>
      </div>

      {community.description && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {community.description}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          <span>{community.member_count.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <MessageSquare className="w-3 h-3" />
          <span>{community.post_count.toLocaleString()}</span>
        </div>
      </div>
    </AnimatedCard>
  );
};

export default memo(CommunityCard);
