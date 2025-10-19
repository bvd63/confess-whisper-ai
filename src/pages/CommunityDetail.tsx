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
import LoadingSpinner from "@/components/LoadingSpinner";
import ConfessionCard from "@/components/ConfessionCard";
import { AnimatedCard } from "@/components/AnimatedCard";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const CommunityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);
  const { user } = useCurrentUser();
  const { membership, isMember, joinCommunity, leaveCommunity, isJoining, isLeaving } = 
    useCommunityMembers(id!);
  const { isPremium } = usePremiumStatus(user?.id);
  const { t } = useLanguage();

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
      <AppLayout>
        <LoadingSpinner />
      </AppLayout>
    );
  }

  if (!community) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 text-center pb-24">
          <p className="text-sm sm:text-base text-muted-foreground">{t.communities_not_found}</p>
          <Button onClick={() => navigate('/communities')} className="mt-4">
            {t.communities_back}
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
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

        <AnimatedCard glass hover="lift" className="p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-4xl">
                {community.icon || "🌟"}
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-1">
                  <GradientText variant="hero">{community.name}</GradientText>
                </h1>
                <Badge variant="outline">{community.category}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={isMember ? "outline" : "default"}
                onClick={() => isMember ? leaveCommunity() : joinCommunity()}
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
            <p className="text-muted-foreground mb-4">{community.description}</p>
          )}

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
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
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t.communities_recent}</h2>
          {loadingConfessions ? (
            <LoadingSpinner />
          ) : confessions && confessions.length > 0 ? (
            confessions.map((confession, index) => (
              <div key={confession.id} style={{ animationDelay: `${index * 50}ms` }}>
                <ConfessionCard 
                  confession={confession}
                  isPremium={isPremium}
                  onUpgradeClick={() => setShowPremiumDialog(true)}
                  onInsightGenerated={() => {}}
                />
              </div>
            ))
          ) : (
            <AnimatedCard glass className="p-8 text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
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
  );
};

export default CommunityDetail;
