import { ArrowLeft, ChevronRight, User, Bell, Flame, HelpCircle, Gift, UserX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import AppLayout from '@/components/AppLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import StreakReminder from '@/components/StreakReminder';
import { StreakDisplay } from '@/components/StreakDisplay';
import { RateLimitIndicator } from '@/components/RateLimitIndicator';
import { useConfessionRateLimit } from '@/hooks/useConfessionRateLimit';
import { Card } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { useStreakManager } from '@/hooks/useStreakManager';
import { cn } from '@/lib/utils';
import { NotificationSettings as NotificationSettingsComponent } from '@/components/NotificationSettings';
import { ProfileEditor } from '@/components/ProfileEditor';
import { EmailDisplay } from '@/components/EmailDisplay';
import { PasswordChange } from '@/components/PasswordChange';
import { LogoutSection } from '@/components/settings/LogoutSection';
import { DeleteAccountSection } from '@/components/settings/DeleteAccountSection';
import ReferralSystem from '@/components/ReferralSystem';
import BlockedUsers from '@/components/BlockedUsers';

interface MenuItemProps {
  icon: React.ElementType;
  title: string;
  onClick?: () => void;
  expandable?: boolean;
  expanded?: boolean;
  children?: React.ReactNode;
}

const MenuItem = ({ icon: Icon, title, onClick, expandable = true, expanded = false, children }: MenuItemProps) => {
  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={onClick}
        className={cn(
          "w-full px-6 py-4 flex items-center justify-between hover:bg-accent/50 transition-colors",
          expanded && "bg-accent/30"
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <span className="text-base font-semibold">{title}</span>
        </div>
        {expandable && <ChevronRight className={cn("h-5 w-5 text-muted-foreground transition-transform", expanded && "rotate-90")} />}
      </button>
      
      {expanded && children && (
        <div className="px-6 py-4 space-y-4 bg-muted/20">
          {children}
        </div>
      )}
    </div>
  );
};

const SettingsActivity = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, isLoading } = useCurrentUser();
  const { 
    remainingRequests, 
    totalRequests, 
    getRemainingTime, 
    isLimited 
  } = useConfessionRateLimit();
  const { streakData } = useStreakManager();
  const [profileData, setProfileData] = useState<{
    nickname: string | null;
    bio: string | null;
    handle: string | null;
    privacy_mode: string | null;
    nickname_updated_at: string | null;
  } | null>(null);
  const [passwordChangedAt, setPasswordChangedAt] = useState<string | null>(null);
  
  const [expandedSection, setExpandedSection] = useState<string | null>('streak');

  // Navigate to auth if no user - use useEffect to avoid render errors
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [isLoading, user, navigate]);

  // Load profile data
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('nickname, bio, handle, privacy_mode, nickname_updated_at, password_changed_at')
          .eq('user_id', user.id)
          .single();
        if (error) throw error;
        setProfileData({
          nickname: data.nickname,
          bio: data.bio,
          handle: data.handle,
          privacy_mode: data.privacy_mode,
          nickname_updated_at: data.nickname_updated_at,
        });
        setPasswordChangedAt(data.password_changed_at || null);
      } catch (error) {
        console.error('Error loading profile data:', error);
      }
    };
    
    if (user?.id) {
      loadProfileData();
    }
  }, [user?.id]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const reloadProfileData = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname, bio, handle, privacy_mode, nickname_updated_at, password_changed_at')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      setProfileData({
        nickname: data.nickname,
        bio: data.bio,
        handle: data.handle,
        privacy_mode: data.privacy_mode,
        nickname_updated_at: data.nickname_updated_at,
      });
      setPasswordChangedAt(data.password_changed_at || null);
    } catch (error) {
      console.error('Error reloading profile data:', error);
    }
  };

  if (isLoading) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="hover:bg-accent"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">{t.settings_activity_title}</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-accent"
            >
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="px-6 py-3 text-sm text-muted-foreground">
          {t.settings} / {t.settings_activity_title}
        </div>

        {/* Menu Sections */}
        <Card className="mx-4 my-4 overflow-hidden">
          {/* Account Settings */}
          <MenuItem
            icon={User}
            title={t.settings_activity_account}
            expanded={expandedSection === 'account'}
            onClick={() => toggleSection('account')}
          >
            {profileData && (
              <div className="space-y-4">
                <ProfileEditor 
                  userId={user.id} 
                  currentProfile={profileData} 
                  onUpdate={reloadProfileData} 
                />
                <EmailDisplay email={user.email || ''} />
                <PasswordChange 
                  userId={user.id} 
                  passwordChangedAt={passwordChangedAt} 
                />
                
                <LogoutSection />
                <DeleteAccountSection userId={user.id} userEmail={user.email || ''} />
              </div>
            )}
          </MenuItem>

          {/* Notifications */}
          <MenuItem
            icon={Bell}
            title={t.settings_activity_notifications}
            expanded={expandedSection === 'notifications'}
            onClick={() => toggleSection('notifications')}
          >
            <NotificationSettingsComponent />
          </MenuItem>

          {/* Streak & Rewards */}
          <MenuItem
            icon={Flame}
            title={t.settings_activity_streak}
            expanded={expandedSection === 'streak'}
            onClick={() => toggleSection('streak')}
          >
            {/* Don't lose your streak banner */}
            <StreakReminder userId={user.id} />
            
            {/* Streak Summary */}
            <div>
              <h3 className="font-semibold mb-3">{t.settings_activity_streak_summary}</h3>
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
                    <div className="text-right">
                      <p className="text-lg font-bold">{streakData.currentStreak} Day Streak</p>
                      <p className="text-sm text-muted-foreground">{streakData.longestStreak} days</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Current Streak & Rewards */}
            <div>
              <h3 className="font-semibold mb-3">{t.settings_activity_current_streak}</h3>
              <StreakDisplay />
            </div>

            {/* Requests Remaining */}
            <div>
              <RateLimitIndicator
                remaining={remainingRequests}
                total={totalRequests}
                resetTime={getRemainingTime()}
                isLimited={isLimited}
              />
            </div>
          </MenuItem>

          {/* Referral Program */}
          <MenuItem
            icon={Gift}
            title={t.referral_program_title}
            expanded={expandedSection === 'referral'}
            onClick={() => toggleSection('referral')}
          >
            <ReferralSystem userId={user.id} />
          </MenuItem>

          {/* Privacy & Blocking */}
          <MenuItem
            icon={UserX}
            title={t.blocked_users_title}
            expanded={expandedSection === 'blocking'}
            onClick={() => toggleSection('blocking')}
          >
            <BlockedUsers userId={user.id} />
          </MenuItem>

          {/* Support & Legal */}
          <MenuItem
            icon={HelpCircle}
            title={t.settings_activity_support}
            expandable={false}
            onClick={() => navigate('/terms')}
          />
        </Card>
      </div>
    </AppLayout>
  );
};

export default SettingsActivity;
