import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import AppLayout from '@/components/AppLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import StreakReminder from '@/components/StreakReminder';
import { StreakDisplay } from '@/components/StreakDisplay';
import { RateLimitIndicator } from '@/components/RateLimitIndicator';
import { useConfessionRateLimit } from '@/hooks/useConfessionRateLimit';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card } from '@/components/ui/card';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useStreakManager } from '@/hooks/useStreakManager';
import { Flame } from 'lucide-react';

const SettingsActivity = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useCurrentUser();
  const { 
    remainingRequests, 
    totalRequests, 
    getRemainingTime, 
    isLimited 
  } = useConfessionRateLimit();
  const { streakData } = useStreakManager();
  
  const [openSections, setOpenSections] = useState({
    streakSummary: true,
    currentStreak: true,
    usage: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-xs text-muted-foreground">{t.settings}</p>
            <h1 className="text-2xl font-bold">{t.settings_activity_title}</h1>
          </div>
        </div>

        <div className="space-y-4">
          {/* Streak Summary Section */}
          <Collapsible 
            open={openSections.streakSummary}
            onOpenChange={() => toggleSection('streakSummary')}
          >
            <Card className="overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                <h2 className="text-lg font-semibold">{t.settings_activity_streak_summary}</h2>
                <ChevronDown 
                  className={`h-5 w-5 transition-transform ${openSections.streakSummary ? 'rotate-180' : ''}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0 space-y-4">
                  {/* Streak Reminder - "Don't lose your streak!" banner */}
                  <StreakReminder userId={user.id} />
                  
                  {/* Streak Display Card - Current Streak basic info */}
                  {streakData && (streakData.currentStreak > 0 || streakData.longestStreak > 0) && (
                    <Card className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-500/20 rounded-full">
                            <Flame className="w-5 h-5 text-orange-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">
                              {streakData.currentStreak} Day Streak 🔥
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Best: {streakData.longestStreak} days
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Current Streak & Rewards Section */}
          <Collapsible 
            open={openSections.currentStreak}
            onOpenChange={() => toggleSection('currentStreak')}
          >
            <Card className="overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                <h2 className="text-lg font-semibold">{t.settings_activity_current_streak}</h2>
                <ChevronDown 
                  className={`h-5 w-5 transition-transform ${openSections.currentStreak ? 'rotate-180' : ''}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0">
                  {/* Enhanced Streak Display with level, points, progress bar, and VIP indicator */}
                  <StreakDisplay />
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Usage Section */}
          <Collapsible 
            open={openSections.usage}
            onOpenChange={() => toggleSection('usage')}
          >
            <Card className="overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                <h2 className="text-lg font-semibold">{t.settings_activity_usage}</h2>
                <ChevronDown 
                  className={`h-5 w-5 transition-transform ${openSections.usage ? 'rotate-180' : ''}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0">
                  {/* Requests Remaining Progress Bar */}
                  <RateLimitIndicator
                    remaining={remainingRequests}
                    total={totalRequests}
                    resetTime={getRemainingTime()}
                    isLimited={isLimited}
                  />
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>
    </AppLayout>
  );
};

export default SettingsActivity;
