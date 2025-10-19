import { useState } from "react";
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
import { Settings, Download, Trash2, LogOut, Loader2, Shield, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
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
  const { subscriptionTier, subscriptionEndsAt, isOnTrial, trialEndDate } = usePremiumStatus(user?.id);

  // Get benefits list based on tier
  const getBenefits = () => {
    if (subscriptionTier === 'vip') {
      return [
        t.plans_vip_benefit_confessions,
        t.plans_vip_benefit_allpremium,
        t.plans_vip_benefit_images,
        t.plans_vip_benefit_stats,
        t.plans_vip_benefit_support,
        t.plans_vip_benefit_badge,
      ];
    }
    if (subscriptionTier === 'premium' || isOnTrial) {
      return [
        t.plans_premium_benefit_confessions,
        t.plans_premium_benefit_ai,
        t.plans_premium_benefit_analytics,
        t.plans_premium_benefit_badge,
        t.plans_premium_benefit_noads,
        t.plans_premium_benefit_priority,
      ];
    }
    return [
      t.plans_free_benefit_confessions,
      t.plans_free_benefit_basic,
      t.plans_free_benefit_ads,
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
      console.error('Error exporting data:', error);
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
      console.error('Error deleting account:', error);
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto glass-strong">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl flex items-center gap-2">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-primary animate-pulse-glow" />
              {t.settings}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t.settings_manage}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 sm:space-y-3 py-3 sm:py-4">
            {/* Current Plan */}
            <div className="p-3 sm:p-4 border border-primary/30 rounded-lg bg-primary/5 hover-lift transition-colors">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-1.5 sm:p-2 rounded-full bg-primary/10">
                  <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm sm:text-base text-foreground">
                      {t.plans_current_plan}
                    </h3>
                    <SubscriptionBadge 
                      tier={subscriptionTier as 'free' | 'premium' | 'vip'} 
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
