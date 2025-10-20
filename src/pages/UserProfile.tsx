import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ProfileTabs } from "@/pages/ProfileTabs";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { InstagramBottomNav } from "@/components/InstagramBottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { TrialBanner } from "@/components/TrialBanner";
import { TierProfileCard } from "@/components/TierProfileCard";

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
  const [premiumDialogOpen, setPremiumDialogOpen] = useState(false);

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
      console.error("Error loading profile:", error);
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
      <AppLayout>
        <div className="container max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 pb-24">
          <Skeleton className="h-32 w-full mb-4 sm:mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
        <InstagramBottomNav />
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="container max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 text-center pb-24">
          <p className="text-sm sm:text-base text-muted-foreground">User not found</p>
        </div>
        <InstagramBottomNav />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 pb-24">
        {isOnTrial && trialEndDate && currentUser.id === userId && (
          <TrialBanner trialEndDate={trialEndDate} />
        )}
        
        <TierProfileCard tier={subscriptionTier as "free" | "premium" | "vip"} className="mb-6">
          <ProfileHeader
            userId={userId!}
            currentUserId={currentUser.id}
            nickname={profile.nickname}
            confessionsCount={confessionsCount}
          />
        </TierProfileCard>

        <div className="mt-8">
          <ProfileTabs 
            userId={userId!} 
            isOwnProfile={currentUser.id === userId}
            isPremium={isPremium}
            onUpgradeClick={() => setPremiumDialogOpen(true)}
            onInsightGenerated={() => {}}
          />
        </div>
      </div>
      
      <InstagramBottomNav />
    </AppLayout>
  );
};

export default UserProfile;
