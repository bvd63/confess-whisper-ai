import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare, MessageSquarePlus, Award, Heart, Star, Flame, Trophy, Cake, Lock, Share2, Eye, Bookmark, Moon, Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { ExpiryTimer } from "./ExpiryTimer";
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
  Share: Share2,
  Eye,
  Bookmark,
  Moon,
  Users,
  TrendingUp
};
interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
}
interface EnrichedBadge extends BadgeData {
  earned: boolean;
  earned_at?: string;
  expires_at?: string | null;
  acquired_at?: string | null;
}

// Mapping between DB badge names (Romanian) and translation keys
const badgeTranslationMap: Record<string, {
  name: string;
  desc: string;
}> = {
  'Prima Confesiune': {
    name: 'badge_first_confession',
    desc: 'badge_first_confession_desc'
  },
  'Confesor Regulat': {
    name: 'badge_regular_confessor',
    desc: 'badge_regular_confessor_desc'
  },
  'Veteran': {
    name: 'badge_veteran',
    desc: 'badge_veteran_desc'
  },
  'Popular': {
    name: 'badge_popular',
    desc: 'badge_popular_desc'
  },
  'Influencer': {
    name: 'badge_influencer',
    desc: 'badge_influencer_desc'
  },
  'Săptămâna de Foc': {
    name: 'badge_fire_week',
    desc: 'badge_fire_week_desc'
  },
  'Luna Perfectă': {
    name: 'badge_perfect_month',
    desc: 'badge_perfect_month_desc'
  },
  'Aniversare': {
    name: 'badge_anniversary',
    desc: 'badge_anniversary_desc'
  },
  'Comentator Activ': {
    name: 'badge_active_commenter',
    desc: 'badge_active_commenter_desc'
  },
  'Împărtășitor': {
    name: 'badge_sharer',
    desc: 'badge_sharer_desc'
  },
  'Cititor Avid': {
    name: 'badge_avid_reader',
    desc: 'badge_avid_reader_desc'
  },
  'Colecționar': {
    name: 'badge_collector',
    desc: 'badge_collector_desc'
  },
  'Nocturn': {
    name: 'badge_night_owl',
    desc: 'badge_night_owl_desc'
  },
  'Social Butterfly': {
    name: 'badge_social_butterfly',
    desc: 'badge_social_butterfly_desc'
  },
  'Confesiune Virală': {
    name: 'badge_viral_confession',
    desc: 'badge_viral_confession_desc'
  }
};
const BadgesDisplay = ({
  userId,
  variant = "compact"
}: BadgesDisplayProps) => {
  const [badges, setBadges] = useState<EnrichedBadge[]>([]);
  const {
    t,
    language
  } = useLanguage();
  const [loading, setLoading] = useState(true);

  // Helper function to get translated badge name and description
  const getBadgeTranslation = (badge: EnrichedBadge) => {
    const mapping = badgeTranslationMap[badge.name];
    if (mapping) {
      return {
        name: t[mapping.name as keyof typeof t] as string,
        description: t[mapping.desc as keyof typeof t] as string
      };
    }
    // Fallback to DB values if no mapping found
    return {
      name: badge.name,
      description: badge.description
    };
  };
  useEffect(() => {
    loadBadges();
  }, [userId]);
  const loadBadges = async () => {
    // Load all badges
    const {
      data: allBadges,
      error: badgesError
    } = await supabase.from('badges').select('*').order('requirement_value', {
      ascending: true
    });

    // Load user's earned badges with expiry info
    const {
      data: userBadges,
      error: userBadgesError
    } = await supabase.from('user_badges').select('badge_id, earned_at, expires_at, acquired_at').eq('user_id', userId);
    if (!badgesError && !userBadgesError && allBadges) {
      // Filter out expired badges
      const activeBadges = userBadges?.filter(ub => {
        if (!ub.expires_at) return true;
        return new Date(ub.expires_at) > new Date();
      }) || [];
      const earnedBadgeIds = new Set(activeBadges.map(ub => ub.badge_id));
      const earnedBadgeMap = new Map(activeBadges.map(ub => [ub.badge_id, {
        earned_at: ub.earned_at,
        expires_at: ub.expires_at,
        acquired_at: ub.acquired_at
      }]));
      const enrichedBadges: EnrichedBadge[] = allBadges.map(badge => {
        const badgeInfo = earnedBadgeMap.get(badge.id);
        return {
          ...badge,
          earned: earnedBadgeIds.has(badge.id),
          earned_at: badgeInfo?.earned_at,
          expires_at: badgeInfo?.expires_at,
          acquired_at: badgeInfo?.acquired_at
        };
      });
      setBadges(enrichedBadges);
    }
    setLoading(false);
  };
  if (loading) return null;
  if (badges.length === 0) return null;
  if (variant === "compact") {
    const earnedBadges = badges.filter(b => b.earned);
    return <TooltipProvider>
        <div className="flex gap-1 sm:gap-1.5 flex-wrap">
          {earnedBadges.slice(0, 3).map(badge => {
          const IconComponent = iconMap[badge.icon] || Award;
          const translation = getBadgeTranslation(badge);
          return <Tooltip key={badge.id}>
                <TooltipTrigger>
                  
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-semibold text-xs sm:text-sm">{translation.name}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{translation.description}</p>
                </TooltipContent>
              </Tooltip>;
        })}
          {earnedBadges.length > 3 && <Badge variant="outline" className="text-[10px] sm:text-xs h-6 sm:h-auto px-1.5 sm:px-2">
              +{earnedBadges.length - 3}
            </Badge>}
        </div>
      </TooltipProvider>;
  }
  return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {badges.map(badge => {
      const IconComponent = iconMap[badge.icon] || Award;
      const translation = getBadgeTranslation(badge);
      const isLocked = !badge.earned;
      return <div key={badge.id} className={cn("flex flex-col items-center gap-2 p-3 sm:p-4 border rounded-lg transition-colors relative", isLocked ? "bg-muted/50 opacity-60" : "bg-card hover:bg-accent/50")}>
            <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center relative", isLocked ? "bg-muted" : "bg-primary/10")}>
              {isLocked ? <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" /> : <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />}
            </div>
            <div className="text-center">
              <p className={cn("font-semibold text-xs sm:text-sm", isLocked && "text-muted-foreground")}>
                {translation.name}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{translation.description}</p>
              {!isLocked && badge.expires_at && <div className="mt-2">
                  <ExpiryTimer expiresAt={badge.expires_at} className="text-[10px]" showIcon={false} />
                </div>}
              {!isLocked && badge.earned_at && !badge.expires_at && <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  {t.badges_earned_on} {new Date(badge.earned_at).toLocaleDateString(language === 'es' ? 'es-ES' : language === 'de' ? 'de-DE' : 'en-US')}
                </p>}
            </div>
          </div>;
    })}
    </div>;
};
export default BadgesDisplay;