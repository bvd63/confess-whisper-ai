import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { GradientText } from "@/components/GradientText";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, ArrowLeft, Settings } from "lucide-react";
import { useCommunityMembers } from "@/hooks/useCommunities";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { LoadingQuotes } from "@/components/LoadingQuotes";
import ConfessionCard from "@/components/ConfessionCard";
import { AnimatedCard } from "@/components/AnimatedCard";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { UnifiedShopDialog } from "@/components/UnifiedShopDialog";
import VirtualizedConfessions from "@/components/VirtualizedConfessions";

const CommunityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { user } = useCurrentUser();
  const { membership, isMember, joinCommunity, leaveCommunity, isJoining, isLeaving } = 
    useCommunityMembers(id!);
  const { isPremium } = usePremiumStatus(user?.id);
  const { t } = useLanguage();
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);

  const { data: community, isLoading: loadingCommunity } = useQuery({
    queryKey: ['community', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: confessions, isLoading: loadingConfessions } = useQuery({
    queryKey: ['community-confessions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('confessions')
        .select('*')
        .eq('community_id', id)
        .eq('moderation_status', 'approved')
        .eq('is_draft', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (loadingCommunity) {
    return (
      <>
      <AppLayout onManageSubscription={() => setManageSubDialogOpen(true)}>
        <LoadingQuotes />
      </AppLayout>
      <UnifiedShopDialog open={manageSubDialogOpen} onOpenChange={setManageSubDialogOpen} />
      </>
    );
  }

  if (!community) {
    return (
      <>
      <AppLayout onManageSubscription={() => setManageSubDialogOpen(true)}>
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 text-center pb-24">
          <p className="text-sm sm:text-base text-muted-foreground">{t.communities_not_found}</p>
          <Button onClick={() => navigate('/communities')} className="mt-4">
            {t.communities_back}
          </Button>
        </div>
      </AppLayout>
      <UnifiedShopDialog open={manageSubDialogOpen} onOpenChange={setManageSubDialogOpen} />
      </>
    );
  }

  return (
    <>
    <AppLayout onManageSubscription={() => setManageSubDialogOpen(true)}>
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 pb-24">
        {/* Header */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/communities')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.communities_back}
        </Button>

        <AnimatedCard glass hover="lift" className="p-4 sm:p-5 md:p-6 mb-4 sm:mb-5 md:mb-6">
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl sm:text-3xl md:text-4xl">
                {community.icon || "🌟"}
              </div>
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-0.5 sm:mb-1">
                  <GradientText variant="hero">{community.name}</GradientText>
                </h1>
                <Badge variant="outline">{community.category}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
            <Button
              variant={isMember ? "outline" : "default"}
              onClick={() => isMember ? leaveCommunity() : joinCommunity(community.is_private || false)}
              disabled={isJoining || isLeaving}
            >
              {isMember ? t.communities_leave : t.communities_join}
            </Button>
              {membership?.role === 'admin' && (
                <Button variant="ghost" size="icon">
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {community.description && (
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">{community.description}</p>
          )}

          <div className="flex items-center gap-3 sm:gap-4 md:gap-5 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{community.member_count.toLocaleString()} {t.communities_members}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>{community.post_count.toLocaleString()} {t.communities_posts}</span>
            </div>
          </div>
        </AnimatedCard>

        {/* Confessions */}
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold">{t.communities_recent}</h2>
          {loadingConfessions ? (
            <LoadingQuotes />
          ) : confessions && confessions.length > 15 ? (
            <VirtualizedConfessions
              confessions={confessions}
              isPremium={isPremium}
              onUpgradeClick={() => {}}
              onInsightGenerated={() => {}}
            />
          ) : confessions && confessions.length > 0 ? (
            confessions.map((confession, index) => (
              <div key={confession.id} style={{ animationDelay: `${index * 50}ms` }}>
                <ConfessionCard 
                  confession={confession}
                  isPremium={isPremium}
                  onUpgradeClick={() => {}}
                  onInsightGenerated={() => {}}
                />
              </div>
            ))
          ) : (
            <AnimatedCard glass className="p-6 sm:p-8 text-center">
              <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
              <p className="text-sm sm:text-base text-muted-foreground">
                {t.communities_no_posts}
              </p>
              <Button 
                onClick={() => navigate('/compose')} 
                className="mt-4"
              >
                {t.communities_create_confession}
              </Button>
            </AnimatedCard>
          )}
        </div>
      </div>
    </AppLayout>
    <UnifiedShopDialog open={manageSubDialogOpen} onOpenChange={setManageSubDialogOpen} />
    </>
  );
};

export default CommunityDetail;
