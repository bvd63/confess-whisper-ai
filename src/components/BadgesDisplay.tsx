import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare, MessageSquarePlus, Award, Heart, Star, Flame, Trophy, Cake } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

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

// Mapping between DB badge names (Romanian) and translation keys
const badgeTranslationMap: Record<string, { name: string; desc: string }> = {
  'Prima Confesiune': { name: 'badge_first_confession', desc: 'badge_first_confession_desc' },
  'Confesor Regulat': { name: 'badge_regular_confessor', desc: 'badge_regular_confessor_desc' },
  'Veteran': { name: 'badge_veteran', desc: 'badge_veteran_desc' },
  'Popular': { name: 'badge_popular', desc: 'badge_popular_desc' },
  'Influencer': { name: 'badge_influencer', desc: 'badge_influencer_desc' },
  'Săptămâna de Foc': { name: 'badge_fire_week', desc: 'badge_fire_week_desc' },
  'Luna Perfectă': { name: 'badge_perfect_month', desc: 'badge_perfect_month_desc' },
  'Aniversare': { name: 'badge_anniversary', desc: 'badge_anniversary_desc' },
};

const BadgesDisplay = ({ userId, variant = "compact" }: BadgesDisplayProps) => {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  
  // Helper function to get translated badge name and description
  const getBadgeTranslation = (badge: UserBadge) => {
    const mapping = badgeTranslationMap[badge.badges.name];
    if (mapping) {
      return {
        name: t[mapping.name as keyof typeof t] as string,
        description: t[mapping.desc as keyof typeof t] as string,
      };
    }
    // Fallback to DB values if no mapping found
    return {
      name: badge.badges.name,
      description: badge.badges.description,
    };
  };

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
            const translation = getBadgeTranslation(userBadge);
            return (
              <Tooltip key={userBadge.badge_id}>
                <TooltipTrigger>
                  <Badge variant="secondary" className="gap-1">
                    <IconComponent className="w-3 h-3" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-semibold">{translation.name}</p>
                  <p className="text-xs text-muted-foreground">{translation.description}</p>
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
        const translation = getBadgeTranslation(userBadge);
        return (
          <div
            key={userBadge.badge_id}
            className="flex flex-col items-center gap-2 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <IconComponent className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">{translation.name}</p>
              <p className="text-xs text-muted-foreground">{translation.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t.badges_earned_on} {new Date(userBadge.earned_at).toLocaleDateString(
                  language === 'es' ? 'es-ES' : language === 'de' ? 'de-DE' : 'en-US'
                )}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BadgesDisplay;