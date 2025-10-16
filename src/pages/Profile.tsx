import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Settings } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useSubscriptionCheck } from "@/hooks/useSubscriptionCheck";
import UserConfessionsList from "@/components/UserConfessionsList";
import UserAnalytics from "@/components/UserAnalytics";
import BadgesDisplay from "@/components/BadgesDisplay";
import StreakCounter from "@/components/StreakCounter";
import UserPreferences from "@/components/UserPreferences";
import MoodStats from "@/components/MoodStats";
import WordCloudViz from "@/components/WordCloudViz";
import FollowStats from "@/components/FollowStats";
import StreakReminder from "@/components/StreakReminder";
import AchievementToast from "@/components/AchievementToast";
import AdvancedAnalytics from "@/components/AdvancedAnalytics";
import ExportDataDialog from "@/components/ExportDataDialog";
import ModerationPanel from "@/components/ModerationPanel";
import CoinsDisplay from "@/components/CoinsDisplay";
import BlockedUsers from "@/components/BlockedUsers";
import ReferralSystem from "@/components/ReferralSystem";
import PremiumDialog from "@/components/PremiumDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useCurrentUser();
  const { isPremium, subscriptionTier, isVIP } = usePremiumStatus(user?.id);
  const { checkSubscription } = useSubscriptionCheck(user?.id);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [premiumDialogOpen, setPremiumDialogOpen] = useState(false);
  const { isModerator } = useUserRole(user?.id);
  const { toast } = useToast();

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: t.profile_portal_error,
        description: t.profile_portal_error_desc,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AchievementToast userId={user.id} />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.common_back}
          </Button>
          
          <div className="flex items-center gap-3">
            <User className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">{t.profile_title}</h1>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>

        <StreakReminder userId={user.id} />

        <Tabs defaultValue="statistics" className="space-y-6 mt-6">
          <TabsList className={`grid w-full ${isModerator ? 'grid-cols-6' : 'grid-cols-5'}`}>
            <TabsTrigger value="statistics">{t.profile_statistics}</TabsTrigger>
            <TabsTrigger value="confessions">{t.profile_my_confessions}</TabsTrigger>
            <TabsTrigger value="achievements">Realizări</TabsTrigger>
            <TabsTrigger value="mood">Stări</TabsTrigger>
            <TabsTrigger value="settings">Setări</TabsTrigger>
            {isModerator && <TabsTrigger value="moderation">Moderare</TabsTrigger>}
          </TabsList>

          <TabsContent value="statistics" className="space-y-6">
            {/* Subscription Status Card */}
            <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">
                    Plan {subscriptionTier === 'free' ? 'Gratuit' : subscriptionTier === 'vip' ? 'VIP' : 'Premium'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isPremium ? 'Mulțumim pentru suport!' : 'Upgrade pentru mai multe funcții'}
                  </p>
                </div>
                {isPremium ? (
                  <Button onClick={handleManageSubscription} variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Gestionează abonament
                  </Button>
                ) : (
                  <Button onClick={() => setPremiumDialogOpen(true)}>
                    Upgrade la Premium
                  </Button>
                )}
              </div>
            </div>

            <StreakCounter userId={user.id} variant="full" />
            <CoinsDisplay userId={user.id} variant="full" />
            <FollowStats userId={user.id} />
            <UserAnalytics />
            <AdvancedAnalytics userId={user.id} />
            <WordCloudViz userId={user.id} />
          </TabsContent>

          <TabsContent value="confessions" className="space-y-6">
            <UserConfessionsList />
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Badge-urile tale</h2>
              <BadgesDisplay userId={user.id} variant="full" />
            </div>
          </TabsContent>

          <TabsContent value="mood" className="space-y-6">
            <MoodStats userId={user.id} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <UserPreferences userId={user.id} />
            <ReferralSystem userId={user.id} />
            <BlockedUsers userId={user.id} />
            
            <div className="pt-4">
              <Button 
                onClick={() => setExportDialogOpen(true)}
                variant="outline"
                className="w-full"
              >
                Exportă datele mele
              </Button>
            </div>
          </TabsContent>

          {isModerator && (
            <TabsContent value="moderation" className="space-y-6">
              <ModerationPanel userId={user.id} />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <ExportDataDialog 
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        userId={user.id}
      />

      <PremiumDialog
        open={premiumDialogOpen}
        onOpenChange={setPremiumDialogOpen}
        onUpgrade={() => {}}
      />
    </div>
  );
};

export default Profile;
