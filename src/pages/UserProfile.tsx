import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ProfileTabs } from "@/pages/ProfileTabs";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { Skeleton } from "@/components/ui/skeleton";
import { logError } from "@/lib/logger";
import { TierProfileCard } from "@/components/TierProfileCard";
import { UnifiedShopDialog } from "@/components/UnifiedShopDialog";
import { GiftCoinsDialog } from "@/components/coins/GiftCoinsDialog";
import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface UserProfileData {
  nickname: string;
  bio?: string;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useCurrentUser();
  const { isPremium, isOnTrial, trialEndDate, subscriptionTier } = usePremiumStatus(currentUser?.id);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [confessionsCount, setConfessionsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);
  const [giftCoinsOpen, setGiftCoinsOpen] = useState(false);
  const isOwnProfile = currentUser?.id === userId;
  const { t } = useLanguage();

  useEffect(() => {
    if (!userId) return;
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      // Load profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("user_id", userId)
        .single();

      if (profileError) throw profileError;

      // Load confessions count
      const { count, error: countError } = await supabase
        .from("confessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("moderation_status", "approved");

      if (countError) throw countError;

      setProfile(profileData);
      setConfessionsCount(count || 0);
    } catch (error) {
      logError("Error loading profile", error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    navigate("/auth");
    return null;
  }

  if (isLoading) {
    return (
      <>
      <AppLayout onManageSubscription={() => setManageSubDialogOpen(true)}>
        <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
      <UnifiedShopDialog open={manageSubDialogOpen} onOpenChange={setManageSubDialogOpen} />
      </>
    );
  }

  if (!profile) {
    return (
      <>
      <AppLayout onManageSubscription={() => setManageSubDialogOpen(true)}>
        <div className="mx-auto w-full max-w-2xl px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">{t.no_users_found}</p>
        </div>
      </AppLayout>
      <UnifiedShopDialog open={manageSubDialogOpen} onOpenChange={setManageSubDialogOpen} />
      </>
    );
  }

  return (
    <>
    <AppLayout onManageSubscription={() => setManageSubDialogOpen(true)}>
      <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-6">
        <TierProfileCard tier={subscriptionTier as "free" | "vip"} className="mb-6">
          <ProfileHeader
            userId={userId!}
            currentUserId={currentUser.id}
            nickname={profile.nickname}
            confessionsCount={confessionsCount}
          />
          
          {!isOwnProfile && currentUser && (
            <div className="mt-4 flex justify-center">
              <Button
                onClick={() => setGiftCoinsOpen(true)}
                variant="outline"
                size="sm"
                className="h-10 gap-2 rounded-xl border border-border/60 px-6 font-semibold hover:border-primary/40 hover:bg-primary/5"
              >
                <Gift className="w-4 h-4 text-primary" />
                <span className="text-sm">{t.coins_gift_send}</span>
              </Button>
            </div>
          )}
        </TierProfileCard>

        <div className="mt-8">
          <ProfileTabs 
            userId={userId!} 
            isOwnProfile={isOwnProfile}
            isPremium={isPremium}
            onUpgradeClick={() => {}}
            onInsightGenerated={() => {}}
          />
        </div>
      </div>
    </AppLayout>
    <UnifiedShopDialog open={manageSubDialogOpen} onOpenChange={setManageSubDialogOpen} />
    <GiftCoinsDialog 
      open={giftCoinsOpen} 
      onOpenChange={setGiftCoinsOpen}
      recipientId={userId}
      recipientName={profile.nickname}
    />
    </>
  );
};

export default UserProfile;
