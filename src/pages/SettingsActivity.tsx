import { ArrowLeft, ChevronRight, User, Bell, Flame, HelpCircle, Gift, UserX, FileText, Shield, Mail, Globe, Palette, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import AppLayout from '@/components/AppLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
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
import { LanguageSelector } from '@/components/LanguageSelector';
import ThemeToggle from '@/components/ThemeToggle';
import { logError } from '@/lib/logger';

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
  const { t, language } = useLanguage();
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
  
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

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
        logError('Error loading profile data', error as Error);
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
      logError('Error reloading profile data', error as Error);
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
          <div className="flex items-center justify-between px-4 py-5">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="hover:bg-accent rounded-xl h-10 w-10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">{t.settings_activity_title}</h1>
            </div>
          </div>
        </div>

        {/* Menu Sections */}
        {/* Rewards Hub - Separate Featured Card */}
        <Card className="mx-4 mt-4 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-amber-500/20">
          <MenuItem
            icon={Flame}
            title="🏆 Rewards & Achievements"
            expandable={false}
            onClick={() => navigate('/rewards')}
          />
        </Card>

        {/* Regular Settings Card */}
        <Card className="mx-4 my-4 overflow-hidden rounded-2xl">
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

          {/* Display & Language */}
          <MenuItem
            icon={Globe}
            title="Display & Language"
            expanded={expandedSection === 'display'}
            onClick={() => toggleSection('display')}
          >
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3">Language</h3>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Select Language</span>
                  </div>
                  <LanguageSelector />
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Theme</h3>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Appearance</span>
                  </div>
                  <ThemeToggle />
                </div>
              </div>
            </div>
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
            expanded={expandedSection === 'support'}
            onClick={() => toggleSection('support')}
          >
            <div className="space-y-3">
              <button
                onClick={() => navigate('/settings/support/ai')}
                className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.support_ai_label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>

              <button
                onClick={() => navigate('/terms')}
                className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.terms_of_service}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>

              <button
                onClick={() => navigate('/privacy')}
                className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.privacy_policy}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>

              <button
                onClick={() => navigate('/settings/support/contact')}
                className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.support_contact_email}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </MenuItem>
        </Card>
      </div>
    </AppLayout>
  );
};

export default SettingsActivity;
