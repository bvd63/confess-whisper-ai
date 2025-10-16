import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
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

const Profile = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useCurrentUser();

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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="statistics">{t.profile_statistics}</TabsTrigger>
            <TabsTrigger value="confessions">{t.profile_my_confessions}</TabsTrigger>
            <TabsTrigger value="achievements">Realizări</TabsTrigger>
            <TabsTrigger value="mood">Stări</TabsTrigger>
            <TabsTrigger value="settings">Setări</TabsTrigger>
          </TabsList>

          <TabsContent value="statistics" className="space-y-6">
            <StreakCounter userId={user.id} variant="full" />
            <FollowStats userId={user.id} />
            <UserAnalytics />
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
