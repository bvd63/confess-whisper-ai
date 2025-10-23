import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProfileTierBadge } from "./ProfileTierBadge";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";

interface UserBadge {
  id: string;
  type: "badge" | "flair";
  icon: string;
  name_key: string;
  acquired_at: string;
  expires_at?: string;
  is_featured: boolean;
}

interface FlairData {
  id: string;
  acquired_at: string;
  expires_at?: string;
  is_featured: boolean;
  profile_flairs: {
    icon: string;
    name_key: string;
  }[];
}

interface BadgeData {
  id: string;
  acquired_at: string;
  expires_at?: string;
  is_featured: boolean;
  badges: {
    icon: string;
    name: string;
  }[];
}

interface BadgeDisplayProps {
  userId: string;
  subscriptionTier?: "free" | "vip";
  maxBadges?: number;
  showSubscription?: boolean;
  variant?: "default" | "compact";
}

export const BadgeDisplay = ({ 
  userId, 
  subscriptionTier = "free",
  maxBadges = 2,
  showSubscription = true,
  variant = "compact"
}: BadgeDisplayProps) => {
  const { t, language } = useLanguage();
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBadges = useCallback(async () => {
    try {
      // Load equipped flairs (equipped flairs are automatically featured and public)
      const { data: flairs } = await supabase
        .from("user_flairs")
        .select(`
          id,
          acquired_at,
          expires_at,
          is_featured,
          is_equipped,
          purchase_scope,
          profile_flairs!inner(
            icon,
            name_key
          )
        `)
        .eq("user_id", userId)
        .eq("is_public", true)
        .eq("is_equipped", true)
        .order("acquired_at", { ascending: false })
        .limit(maxBadges);

      // Load featured badges
      const { data: userBadges } = await supabase
        .from("user_badges")
        .select(`
          id,
          acquired_at,
          expires_at,
          is_featured,
          badges!inner(
            icon,
            name
          )
        `)
        .eq("user_id", userId)
        .eq("is_public", true)
        .eq("is_featured", true)
        .order("acquired_at", { ascending: false })
        .limit(maxBadges);

      const allBadges: UserBadge[] = [
        ...(flairs || []).map((f: FlairData) => ({
          id: f.id,
          type: "flair" as const,
          icon: f.profile_flairs[0]?.icon || '',
          name_key: f.profile_flairs[0]?.name_key || '',
          acquired_at: f.acquired_at,
          expires_at: f.expires_at,
          is_featured: f.is_featured,
        })),
        ...(userBadges || []).map((b: BadgeData) => ({
          id: b.id,
          type: "badge" as const,
          icon: b.badges[0]?.icon || '',
          name_key: b.badges[0]?.name || '',
          acquired_at: b.acquired_at,
          expires_at: b.expires_at,
          is_featured: b.is_featured,
        })),
      ]
        .filter(b => {
          // Filter expired badges
          if (!b.expires_at) return true;
          return new Date(b.expires_at) > new Date();
        })
        .sort((a, b) => new Date(b.acquired_at).getTime() - new Date(a.acquired_at).getTime())
        .slice(0, maxBadges);

      setBadges(allBadges);
    } catch (error) {
      console.error("Error loading badges:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, maxBadges]);

  useEffect(() => {
    loadBadges();

    // Subscribe to real-time updates for this user's badges/flairs
    const channel = supabase
      .channel(`user-badges-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_flairs',
          filter: `user_id=eq.${userId}`
        },
        () => loadBadges()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_badges',
          filter: `user_id=eq.${userId}`
        },
        () => loadBadges()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadBadges]);

  if (loading) return null;

  const hasItems = showSubscription || badges.length > 0;
  if (!hasItems) return null;

  return (
    <div className="inline-flex items-center gap-1 ml-2">
      {showSubscription && subscriptionTier !== "free" && (
        <ProfileTierBadge tier={subscriptionTier} variant={variant} />
      )}
      
      {badges.map((badge) => {
        const translationKey = `flair_${badge.name_key}` as keyof typeof t;
        const badgeName = (t as Record<string, string>)[translationKey] || badge.name_key;
        
        return (
          <TooltipProvider key={badge.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center justify-center w-6 h-6 text-lg cursor-help transition-transform hover:scale-110 hover:drop-shadow-lg">
                  {badge.icon}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <div className="font-semibold">{badgeName}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.perks_badges_earned_on.replace("{date}", format(new Date(badge.acquired_at), "PP"))}
                  </div>
                  {badge.expires_at && (
                    <div className="text-xs text-amber-500">
                      {t.profile_tiers_expires.replace("{date}", format(new Date(badge.expires_at), "PP"))}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
      
      {badges.length > maxBadges && (
        <span className="text-xs text-muted-foreground">+{badges.length - maxBadges}</span>
      )}
    </div>
  );
};
