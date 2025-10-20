import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { AnimatedCard } from "./AnimatedCard";
import { ProfileTierBadge } from "./ProfileTierBadge";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { format } from "date-fns";
import { Eye, EyeOff, Star, StarOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserPerk {
  id: string;
  type: "badge" | "flair";
  icon: string;
  name_key: string;
  acquired_at: string;
  expires_at?: string;
  is_public: boolean;
  is_featured: boolean;
  flair_id?: string;
  badge_id?: string;
  purchase_scope?: string;
}

interface MyPerksProps {
  userId: string;
  subscriptionTier: "free" | "premium" | "vip";
  subscriptionEndsAt?: string;
}

export const MyPerks = ({ userId, subscriptionTier, subscriptionEndsAt }: MyPerksProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [perks, setPerks] = useState<UserPerk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerks();
  }, [userId]);

  const loadPerks = async () => {
    try {
      // Load flairs
      const { data: flairs } = await supabase
        .from("user_flairs")
        .select(`
          id,
          flair_id,
          acquired_at,
          expires_at,
          is_public,
          is_featured,
          purchase_scope,
          profile_flairs!inner(
            icon,
            name_key
          )
        `)
        .eq("user_id", userId)
        .order("acquired_at", { ascending: false });

      // Load badges
      const { data: badges } = await supabase
        .from("user_badges")
        .select(`
          id,
          badge_id,
          acquired_at,
          expires_at,
          is_public,
          is_featured,
          badges!inner(
            icon,
            name
          )
        `)
        .eq("user_id", userId)
        .order("acquired_at", { ascending: false });

      const allPerks: UserPerk[] = [
        ...(flairs || []).map((f: any) => ({
          id: f.id,
          type: "flair" as const,
          flair_id: f.flair_id,
          icon: f.profile_flairs.icon,
          name_key: f.profile_flairs.name_key,
          acquired_at: f.acquired_at,
          expires_at: f.expires_at,
          is_public: f.is_public,
          is_featured: f.is_featured,
          purchase_scope: f.purchase_scope,
        })),
        ...(badges || []).map((b: any) => ({
          id: b.id,
          type: "badge" as const,
          badge_id: b.badge_id,
          icon: b.badges.icon,
          name_key: b.badges.name,
          acquired_at: b.acquired_at,
          expires_at: b.expires_at,
          is_public: b.is_public,
          is_featured: b.is_featured,
        })),
      ];

      setPerks(allPerks);
    } catch (error) {
      console.error("Error loading perks:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = async (perk: UserPerk) => {
    const table = perk.type === "flair" ? "user_flairs" : "user_badges";
    const { error } = await supabase
      .from(table)
      .update({ is_public: !perk.is_public })
      .eq("id", perk.id);

    if (error) {
      toast({
        title: t.error_generic,
        variant: "destructive",
      });
    } else {
      loadPerks();
    }
  };

  const toggleFeatured = async (perk: UserPerk) => {
    // Count current featured items
    const featuredCount = perks.filter(p => p.is_featured).length;
    
    if (!perk.is_featured && featuredCount >= 2) {
      toast({
        title: t.error_generic,
        description: "You can only feature up to 2 items",
        variant: "destructive",
      });
      return;
    }

    const table = perk.type === "flair" ? "user_flairs" : "user_badges";
    const { error } = await supabase
      .from(table)
      .update({ is_featured: !perk.is_featured })
      .eq("id", perk.id);

    if (error) {
      toast({
        title: t.error_generic,
        variant: "destructive",
      });
    } else {
      loadPerks();
    }
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getStatus = (perk: UserPerk) => {
    if (isExpired(perk.expires_at)) return t.perks_badges_status_expired;
    if (!perk.is_public) return t.perks_badges_status_hidden;
    return t.perks_badges_status_active;
  };

  return (
    <div className="space-y-6">
      {/* Subscription Card */}
      <AnimatedCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t.perks_subscription_title}</h3>
        <div className="flex items-center gap-4">
          <ProfileTierBadge tier={subscriptionTier} variant="default" />
          {subscriptionEndsAt && (
            <p className="text-sm text-muted-foreground">
              {t.profile_tiers_expires.replace("{date}", format(new Date(subscriptionEndsAt), "PP"))}
            </p>
          )}
        </div>
      </AnimatedCard>

      {/* Badges & Flairs */}
      <AnimatedCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t.perks_badges_title}</h3>
        
        {loading ? (
          <p className="text-sm text-muted-foreground">{t.ui_loading}</p>
        ) : perks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.perks_no_badges}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {perks.map((perk) => {
              const translationKey = `flair_${perk.name_key}` as any;
              const perkName = (t as any)[translationKey] || perk.name_key;
              const expired = isExpired(perk.expires_at);
              
              return (
                <div
                  key={perk.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{perk.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{perkName}</p>
                          {perk.purchase_scope === 'TRIAL' && (
                            <Badge variant="outline" className="text-[10px] px-1">
                              {t.trial_purchase || 'Trial'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t.perks_badges_earned_on.replace("{date}", format(new Date(perk.acquired_at), "PP"))}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={expired ? "destructive" : perk.is_public ? "success" : "secondary"}
                      className="text-xs"
                    >
                      {getStatus(perk)}
                    </Badge>
                  </div>
                  
                  {perk.expires_at && (
                    <p className={`text-xs ${expired ? "text-destructive" : "text-amber-500"}`}>
                      {t.profile_tiers_expires.replace("{date}", format(new Date(perk.expires_at), "PP"))}
                    </p>
                  )}
                  
                  {!expired && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => toggleVisibility(perk)}
                      >
                        {perk.is_public ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-2" />
                            {t.perks_badges_make_private}
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            {t.perks_badges_make_public}
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant={perk.is_featured ? "default" : "outline"}
                        size="sm"
                        className="flex-1"
                        onClick={() => toggleFeatured(perk)}
                      >
                        {perk.is_featured ? (
                          <>
                            <StarOff className="w-4 h-4 mr-2" />
                            {t.perks_badges_remove_featured}
                          </>
                        ) : (
                          <>
                            <Star className="w-4 h-4 mr-2" />
                            {t.perks_badges_set_featured}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </AnimatedCard>
    </div>
  );
};
