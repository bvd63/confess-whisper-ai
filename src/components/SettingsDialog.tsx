import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/translated-dialog";
import { Button } from "@/components/ui/button";
import { EnhancedButton } from "@/components/EnhancedButton";

import { SubscriptionBadge } from "@/components/SubscriptionBadge";
import { FontSizeControl } from "@/components/FontSizeControl";
import { Settings, Download, Trash2, LogOut, Loader2, Shield, Crown, RefreshCw, Smartphone, Clock, Lock, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useVipStatus } from "@/hooks/usePremiumStatus";
import { useEnhancedAuth } from "@/hooks/useEnhancedAuth";
import { useConfirm } from "@/contexts/ConfirmContext";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { logError } from "@/lib/logger";
import { FREE_DAILY_CONFESSION_LIMIT } from "@/constants/confessionLimits";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useCurrentUser();
  const { subscriptionTier, subscriptionEndsAt, isOnTrial, trialEndDate } = useVipStatus(user?.id);
  const confirm = useConfirm();
  const { sessions: activeSessions, listSessions, revokeSession, revokeAllSessions, rotateCurrentSession } = useEnhancedAuth();
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const currentDeviceId = typeof window !== 'undefined' ? localStorage.getItem('device_id') : null;
  const [rotatingCurrent, setRotatingCurrent] = useState(false);

  // Get benefits list based on tier
  const freeConfessionBenefit = t.plans_free_benefit_confessions.replace(
    '{limit}',
    FREE_DAILY_CONFESSION_LIMIT.toString(),
  );

  const getBenefits = () => {
    if (subscriptionTier === 'vip' || isOnTrial) {
      return [
        t.plans_vip_benefit_confessions,
        t.plans_vip_benefit_unlimited_ai,
        t.plans_vip_benefit_custom_themes,
        t.plans_vip_benefit_private_confessions,
        t.plans_vip_benefit_advanced_stats,
        t.plans_vip_benefit_special_badge,
        t.plans_vip_benefit_priority_support,
        t.plans_vip_benefit_coins_bonus,
        t.plans_vip_benefit_login_rewards,
      ];
    }
    return [
      freeConfessionBenefit,
      t.plans_free_benefit_basic,
    ];
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all user data
      const { data: confessions } = await supabase
        .from('confessions')
        .select('*')
        .eq('user_id', user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const exportData = {
        user: {
          email: user.email,
          created_at: user.created_at,
        },
        profile,
        confessions,
        exported_at: new Date().toISOString(),
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `confess-ai-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: t.settings_data_exported,
        description: t.settings_data_exported,
      });
    } catch (error) {
      logError('Error exporting data', error as Error);
      toast({
        title: t.common_error,
        description: t.settings_export_error,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete user data (confessions will be deleted via cascade)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Sign out and redirect
      await supabase.auth.signOut();
      
      toast({
        title: t.success_deleted,
        description: t.delete_account_description,
      });

      navigate('/');
    } catch (error) {
      logError('Error deleting account', error as Error);
      toast({
        title: t.error_generic,
        description: t.error_delete,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleRefreshSessions = useCallback(async () => {
    setSessionsLoading(true);
    await listSessions();
    setSessionsLoaded(true);
    setSessionsLoading(false);
  }, [listSessions]);

  useEffect(() => {
    if (open && !sessionsLoaded && !sessionsLoading) {
      void handleRefreshSessions();
    }
  }, [open, sessionsLoaded, sessionsLoading, handleRefreshSessions]);

  const handleRevokeSession = useCallback(async (sessionId: string) => {
    const confirmed = await confirm({
      titleKey: 'confirm.revokeSession.title',
      messageKey: 'confirm.revokeSession.message',
      variant: 'warning',
    });

    if (!confirmed) return;

    setRevokingSessionId(sessionId);
    await revokeSession(sessionId);
    setRevokingSessionId(null);
  }, [confirm, revokeSession]);

  const handleRevokeAllSessions = useCallback(async () => {
    const confirmed = await confirm({
      titleKey: 'confirm.revokeAllSessions.title',
      messageKey: 'confirm.revokeAllSessions.message',
      variant: 'danger',
    });

    if (!confirmed) return;

    setRevokingAll(true);
    await revokeAllSessions();
    setRevokingAll(false);
  }, [confirm, revokeAllSessions]);

  const handleRotateCurrentSession = useCallback(async () => {
    setRotatingCurrent(true);
    try {
      await rotateCurrentSession();
    } finally {
      setRotatingCurrent(false);
    }
  }, [rotateCurrentSession]);

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto glass-strong rounded-2xl border-primary/20">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl sm:text-3xl flex items-center gap-3">
              <div className="text-3xl">⚙️</div>
              <span className="font-bold">{t.settings}</span>
            </DialogTitle>
            <DialogDescription className="text-base text-foreground-secondary">
              {t.settings_manage}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-6">
            {/* Current Plan */}
            <div className="p-6 border-2 border-primary/30 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 hover-lift transition-all">
              <div className="flex items-start gap-4">
                <div className="text-3xl">👑</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-foreground">
                      {t.plans_current_plan}
                    </h3>
                    <SubscriptionBadge 
                      tier={subscriptionTier as 'free' | 'vip'} 
                      variant="compact"
                      showTooltip={false}
                    />
                  </div>
                  {isOnTrial && trialEndDate && (
                    <p className="text-xs text-amber-500 font-medium mb-2">
                      {t.trial_banner_days_remaining?.replace('{days}', 
                        Math.ceil((new Date(trialEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)).toString()
                      )}
                    </p>
                  )}
                  {subscriptionEndsAt && !isOnTrial && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {t.plans_renews_on}: {new Date(subscriptionEndsAt).toLocaleDateString()}
                    </p>
                  )}
                  <ul className="space-y-1 mb-3">
                    {getBenefits().map((benefit, idx) => (
                      <li key={idx} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  {subscriptionTier === 'free' && (
                    <EnhancedButton
                      onClick={() => {
                        onOpenChange(false);
                        navigate('/profile');
                      }}
                      variant="default"
                      size="sm"
                      className="text-xs sm:text-sm"
                      glow
                    >
                      {t.plans_upgrade_now}
                  </EnhancedButton>
                )}
              </div>
            </div>
          </div>

          {/* Font Size Control */}
          <div className="p-4 rounded-lg border border-border/50 bg-background/50">
            <FontSizeControl />
          </div>

          {/* Export Data */}
            <div className="p-3 sm:p-4 border border-border/50 rounded-lg hover-lift transition-colors glass">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-1.5 sm:p-2 rounded-full bg-primary/10">
                  <Download className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1">
                    {t.export_data}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                    {t.settings_export_desc}
                  </p>
                  <EnhancedButton
                    onClick={handleExportData}
                    disabled={isExporting}
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm"
                    lift
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                        {t.submitting}
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                        {t.export_data}
                      </>
                    )}
                  </EnhancedButton>
                </div>
              </div>
            </div>

            {/* Active Sessions */}
            <div className="p-3 sm:p-4 border border-border/50 rounded-lg glass hover-lift transition-colors">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-1.5 sm:p-2 rounded-full bg-primary/10">
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1">
                        {t.settings_sessions_title}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {t.settings_sessions_description}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <EnhancedButton
                        onClick={handleRefreshSessions}
                        variant="outline"
                        size="sm"
                        disabled={sessionsLoading || revokingAll}
                        className="text-xs sm:text-sm"
                      >
                        {sessionsLoading ? (
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                        )}
                        {t.settings_sessions_refresh}
                      </EnhancedButton>
                      <EnhancedButton
                        onClick={handleRevokeAllSessions}
                        variant="destructive"
                        size="sm"
                        disabled={revokingAll || !sessionsLoaded || activeSessions.length === 0}
                        className="text-xs sm:text-sm"
                      >
                        {revokingAll ? (
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                        ) : (
                          <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                        )}
                        {t.settings_sessions_revoke_all}
                      </EnhancedButton>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {sessionsLoading && !sessionsLoaded ? (
                      <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t.submitting}
                      </div>
                    ) : sessionsLoaded && activeSessions.length === 0 ? (
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {t.settings_sessions_empty}
                      </p>
                    ) : (
                      activeSessions.map((session) => {
                        const isCurrentDevice = Boolean(session.device_id && currentDeviceId && session.device_id === currentDeviceId);
                        const isRevoking = revokingSessionId === session.id;
                        const lastActive = formatDateTime(session.last_refreshed_at ?? session.created_at);
                        const signedInAt = formatDateTime(session.created_at);
                        const expiresAt = session.expires_at ? formatDateTime(session.expires_at) : null;
                        const expiresSoon = session.expires_at
                          ? new Date(session.expires_at).getTime() - Date.now() < 1000 * 60 * 60 * 24
                          : false;

                        return (
                          <div
                            key={session.id}
                            className="p-3 border border-border/50 rounded-lg bg-background/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                          >
                            <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                              <div className="flex items-center gap-2 text-foreground">
                                <Smartphone className="w-3 h-3" />
                                <span>{session.user_agent || t.settings_sessions_unknown_agent}</span>
                                {isCurrentDevice && (
                                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                                    {t.settings_sessions_current_device}
                                  </Badge>
                                )}
                                {session.stay_connected && (
                                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                                    {t.auth_stay_signed_in}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{t.settings_sessions_signed_in.replace('{time}', signedInAt)}</span>
                              </div>
                              <p>{t.settings_sessions_last_active.replace('{time}', lastActive)}</p>
                              {expiresAt && (
                                <p className="flex items-center gap-2">
                                  {t.settings_sessions_expires_at.replace('{time}', expiresAt)}
                                  {expiresSoon && (
                                    <Badge variant="outline" className="text-[10px] sm:text-xs text-amber-600 border-amber-500/60">
                                      {t.settings_sessions_expires_soon}
                                    </Badge>
                                  )}
                                </p>
                              )}
                              {session.ip_address && (
                                <p>{t.settings_sessions_ip.replace('{ip}', session.ip_address)}</p>
                              )}
                              {session.device_id && (
                                <p>
                                  {t.settings_sessions_device_id.replace(
                                    '{id}',
                                    session.device_id.length > 18
                                      ? `${session.device_id.slice(0, 18)}...`
                                      : session.device_id
                                  )}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2 self-start sm:self-auto">
                              {isCurrentDevice && (
                                <EnhancedButton
                                  variant="outline"
                                  size="sm"
                                  onClick={handleRotateCurrentSession}
                                  disabled={rotatingCurrent || revokingAll}
                                  className="text-xs sm:text-sm"
                                >
                                  {rotatingCurrent ? (
                                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                                  ) : (
                                    <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                                  )}
                                  {t.settings_sessions_rotate_current}
                                </EnhancedButton>
                              )}
                              <EnhancedButton
                                variant="outline"
                                size="sm"
                                onClick={() => handleRevokeSession(session.id)}
                                disabled={isRevoking || revokingAll}
                                className="text-xs sm:text-sm"
                              >
                                {isRevoking ? (
                                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                                ) : (
                                  <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                                )}
                                {t.logout}
                              </EnhancedButton>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy */}
            <div className="p-3 sm:p-4 border border-border/50 rounded-lg glass hover-lift transition-colors">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-1.5 sm:p-2 rounded-full bg-primary/10">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1">
                    {t.privacy_policy}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                    {t.settings_privacy_view}
                  </p>
                  <EnhancedButton
                    onClick={() => {
                      onOpenChange(false);
                      navigate('/privacy');
                    }}
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm"
                    lift
                  >
                    {t.privacy_policy}
                  </EnhancedButton>
                </div>
              </div>
            </div>

            {/* Delete Account */}
            <div className="p-3 sm:p-4 border border-destructive/30 rounded-lg bg-destructive/5 hover-lift transition-colors">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-1.5 sm:p-2 rounded-full bg-destructive/20">
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1">
                    {t.delete_account}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                    {t.delete_account_description}
                  </p>
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="destructive"
                    size="sm"
                    className="text-xs sm:text-sm"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    {t.delete_account}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.delete_confirm}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.delete_warning}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.skip}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.deleting}
                </>
              ) : (
                t.delete_confirm
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SettingsDialog;
