import { ArrowLeft, ChevronRight, User, Bell, HelpCircle, UserX, FileText, Shield, Mail, Globe, Lock, LogOut, Trash2, Trophy, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import AppLayout from '@/components/AppLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { NotificationSettings as NotificationSettingsComponent } from '@/components/NotificationSettings';
import { ProfileEditor } from '@/components/ProfileEditor';
import { PasswordChange } from '@/components/PasswordChange';
import { LogoutSection } from '@/components/settings/LogoutSection';
import { DeleteAccountSection } from '@/components/settings/DeleteAccountSection';
import BlockedUsers from '@/components/BlockedUsers';
import { LanguageSelector } from '@/components/LanguageSelector';
import CoinsDisplay from '@/components/CoinsDisplay';
import { UnifiedShopDialog } from '@/components/UnifiedShopDialog';
import { logError } from '@/lib/logger';

// Premium Glass Menu Item Component
interface GlassMenuItemProps {
  icon: React.ElementType;
  iconColor?: string;
  title: string;
  rightElement?: React.ReactNode;
  onClick?: () => void;
  expandable?: boolean;
  expanded?: boolean;
  children?: React.ReactNode;
  variant?: 'default' | 'danger' | 'featured';
}

const GlassMenuItem = ({ 
  icon: Icon, 
  iconColor = 'text-primary',
  title, 
  rightElement,
  onClick, 
  expandable = true, 
  expanded = false, 
  children,
  variant = 'default'
}: GlassMenuItemProps) => {
  const baseClasses = "w-full px-5 py-4 flex items-center justify-between transition-all duration-200 rounded-2xl";
  
  const variantClasses = {
    default: "glass-card hover:bg-white/10 dark:hover:bg-white/5",
    danger: "bg-gradient-to-r from-red-500/20 to-red-600/10 border border-red-500/30 hover:from-red-500/30 hover:to-red-600/20",
    featured: "bg-gradient-to-r from-primary/20 via-primary/10 to-neon-blue/10 border border-primary/30"
  };

  return (
    <div className="mb-3">
      <button
        onClick={onClick}
        className={cn(baseClasses, variantClasses[variant], expanded && "rounded-b-none")}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            variant === 'danger' ? 'bg-red-500/20' : 'bg-primary/15'
          )}>
            <Icon className={cn("h-5 w-5", variant === 'danger' ? 'text-red-400' : iconColor)} />
          </div>
          <span className={cn(
            "text-base font-semibold",
            variant === 'danger' ? 'text-red-400' : 'text-foreground'
          )}>{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {rightElement}
          {expandable && (
            <ChevronRight className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200", 
              expanded && "rotate-90"
            )} />
          )}
        </div>
      </button>
      
      {expanded && children && (
        <div className="glass-card rounded-t-none rounded-b-2xl border-t-0 px-5 py-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};

// Sub-item for Account Settings
interface SubMenuItemProps {
  icon: React.ElementType;
  title: string;
  onClick?: () => void;
  variant?: 'default' | 'danger';
  rightIcon?: React.ReactNode;
}

const SubMenuItem = ({ icon: Icon, title, onClick, variant = 'default', rightIcon }: SubMenuItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full px-4 py-3.5 flex items-center justify-between rounded-xl transition-all duration-200",
      variant === 'default' 
        ? "bg-muted/30 hover:bg-muted/50 border border-border/30" 
        : "bg-gradient-to-r from-red-500/15 to-red-600/10 hover:from-red-500/25 hover:to-red-600/15 border border-red-500/20"
    )}
  >
    <div className="flex items-center gap-3">
      <Icon className={cn("h-4 w-4", variant === 'danger' ? 'text-red-400' : 'text-muted-foreground')} />
      <span className={cn("text-sm font-medium", variant === 'danger' ? 'text-red-400' : 'text-foreground')}>
        {title}
      </span>
    </div>
    {rightIcon || <ChevronRight className="h-4 w-4 text-muted-foreground" />}
  </button>
);

const SettingsActivity = () => {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const { user, isLoading } = useCurrentUser();
  const [profileData, setProfileData] = useState<{
    nickname: string | null;
    bio: string | null;
    handle: string | null;
    privacy_mode: string | null;
    nickname_updated_at: string | null;
  } | null>(null);
  const [passwordChangedAt, setPasswordChangedAt] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [shopDialogOpen, setShopDialogOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [isLoading, user, navigate]);

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

  if (isLoading || !user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto pb-24">
        {/* Premium Header with Glassmorphism */}
        <div className="sticky top-0 z-10 glass-strong border-b border-border/30">
          <div className="header-gradient">
            <div className="flex items-center justify-between px-4 py-5">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="glass-card h-10 w-10 hover:bg-white/10"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl font-bold">{t.settings_activity_title}</h1>
              </div>
              <div className="flex items-center gap-2">
                <CoinsDisplay userId={user.id} variant="compact" />
                <Button
                  onClick={() => setShopDialogOpen(true)}
                  className="btn-gradient h-9 px-4 rounded-xl text-sm font-semibold"
                >
                  Manage Subscription
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6 space-y-3">
          
          {/* Rewards & Achievements - Featured Card */}
          <GlassMenuItem
            icon={Trophy}
            iconColor="text-amber-400"
            title="🏆 Rewards & Achievements"
            expandable={false}
            variant="featured"
            onClick={() => navigate('/rewards')}
            rightElement={
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-amber-400" />
              </div>
            }
          />

          {/* Account Settings */}
          <GlassMenuItem
            icon={User}
            title={t.settings_activity_account}
            expanded={expandedSection === 'account'}
            onClick={() => toggleSection('account')}
          >
            {profileData && (
              <div className="space-y-3">
                <SubMenuItem 
                  icon={User} 
                  title="Change Username"
                  onClick={() => {/* Username change is handled in ProfileEditor */}}
                />
                <ProfileEditor 
                  userId={user.id} 
                  currentProfile={profileData} 
                  onUpdate={reloadProfileData} 
                />
                
                <SubMenuItem 
                  icon={Lock} 
                  title="Change Password"
                  rightIcon={<Lock className="h-4 w-4 text-muted-foreground" />}
                />
                <PasswordChange 
                  userId={user.id} 
                  passwordChangedAt={passwordChangedAt} 
                />
                
                {/* Logout */}
                <LogoutSection />

                {/* Delete Account */}
                <DeleteAccountSection userId={user.id} userEmail={user.email || ''} />
              </div>
            )}
          </GlassMenuItem>

          {/* Display & Language */}
          <GlassMenuItem
            icon={Globe}
            title="Display & Language"
            expanded={expandedSection === 'display'}
            onClick={() => toggleSection('display')}
            rightElement={
              <div className="flex items-center gap-1">
                {['EN', 'ES', 'DE'].map((lang) => (
                  <span 
                    key={lang}
                    className={cn(
                      "px-2 py-1 text-xs font-semibold rounded-lg transition-colors",
                      language.toUpperCase() === lang 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted/50 text-muted-foreground"
                    )}
                  >
                    {lang}
                  </span>
                ))}
              </div>
            }
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/30">
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Select Language</span>
                </div>
                <LanguageSelector />
              </div>
            </div>
          </GlassMenuItem>

          {/* Blocked Users */}
          <GlassMenuItem
            icon={UserX}
            title={t.blocked_users_title}
            expanded={expandedSection === 'blocking'}
            onClick={() => toggleSection('blocking')}
            rightElement={
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Bell className="h-4 w-4 text-primary" />
              </div>
            }
          >
            <BlockedUsers userId={user.id} />
          </GlassMenuItem>

          {/* Support & Legal */}
          <GlassMenuItem
            icon={HelpCircle}
            title={t.settings_activity_support}
            expanded={expandedSection === 'support'}
            onClick={() => toggleSection('support')}
          >
            <div className="space-y-3">
              <SubMenuItem
                icon={Bot}
                title={t.support_ai_label}
                onClick={() => navigate('/settings/support/ai')}
              />
              <SubMenuItem
                icon={FileText}
                title={t.terms_of_service}
                onClick={() => navigate('/terms')}
              />
              <SubMenuItem
                icon={Shield}
                title={t.privacy_policy}
                onClick={() => navigate('/privacy')}
              />
              <SubMenuItem
                icon={Mail}
                title={t.support_contact_email}
                onClick={() => navigate('/settings/support/contact')}
              />
            </div>
          </GlassMenuItem>

          {/* Notifications */}
          <GlassMenuItem
            icon={Bell}
            title={t.settings_activity_notifications}
            expanded={expandedSection === 'notifications'}
            onClick={() => toggleSection('notifications')}
          >
            <NotificationSettingsComponent />
          </GlassMenuItem>
        </div>
      </div>

      {/* Subscription Dialog */}
      <UnifiedShopDialog 
        open={shopDialogOpen} 
        onOpenChange={setShopDialogOpen}
      />
    </AppLayout>
  );
};

export default SettingsActivity;