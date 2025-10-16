import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare, MessageSquarePlus, Award, Heart, Star, Flame, Trophy, Cake } from "lucide-react";
import { cn } from "@/lib/utils";

interface BadgesDisplayProps {
  userId: string;
  variant?: "compact" | "full";
}

const iconMap: Record<string, any> = {
  MessageSquare,
  MessageSquarePlus,
  Award,
  Heart,
  Star,
  Flame,
  Trophy,
  Cake,
};

interface UserBadge {
  badge_id: string;
  earned_at: string;
  badges: {
    name: string;
    description: string;
    icon: string;
  };
}

const BadgesDisplay = ({ userId, variant = "compact" }: BadgesDisplayProps) => {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBadges();
  }, [userId]);

  const loadBadges = async () => {
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        badge_id,
        earned_at,
        badges (
          name,
          description,
          icon
        )
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (!error && data) {
      setBadges(data as UserBadge[]);
    }
    setLoading(false);
  };

  if (loading) return null;
  if (badges.length === 0) return null;

  if (variant === "compact") {
    return (
      <TooltipProvider>
        <div className="flex gap-1 flex-wrap">
          {badges.slice(0, 3).map((userBadge) => {
            const IconComponent = iconMap[userBadge.badges.icon] || Award;
            return (
              <Tooltip key={userBadge.badge_id}>
                <TooltipTrigger>
                  <Badge variant="secondary" className="gap-1">
                    <IconComponent className="w-3 h-3" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-semibold">{userBadge.badges.name}</p>
                  <p className="text-xs text-muted-foreground">{userBadge.badges.description}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
          {badges.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{badges.length - 3}
            </Badge>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {badges.map((userBadge) => {
        const IconComponent = iconMap[userBadge.badges.icon] || Award;
        return (
          <div
            key={userBadge.badge_id}
            className="flex flex-col items-center gap-2 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <IconComponent className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">{userBadge.badges.name}</p>
              <p className="text-xs text-muted-foreground">{userBadge.badges.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(userBadge.earned_at).toLocaleDateString('ro-RO')}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BadgesDisplay;