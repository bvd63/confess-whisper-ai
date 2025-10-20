import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AnimatedCard } from "./AnimatedCard";
import { GradientText } from "./GradientText";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowUp, ArrowDown, XCircle, RotateCcw, Loader2, Crown, CreditCard, Calendar } from "lucide-react";
import { format } from "date-fns";
import SubscriptionPlans from "./SubscriptionPlans";

interface ManageSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscriptionUpdated?: () => void;
}

interface SubscriptionStatus {
  tier: string;
  isTrial: boolean;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  paymentMethodLast4: string | null;
}

export const ManageSubscriptionDialog = ({ open, onOpenChange, onSubscriptionUpdated }: ManageSubscriptionDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [showPlans, setShowPlans] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (open) {
      loadSubscriptionStatus();
    }
  }, [open]);

  const loadSubscriptionStatus = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('get-subscription-status');
      
      if (error) throw error;
      
      setStatus(data);
      
      // If user is free, show plan selector instead
      if (data.tier === 'free' && !data.isTrial) {
        setShowPlans(true);
      } else {
        setShowPlans(false);
      }
    } catch (error) {
      console.error('Error loading subscription status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (
    action: 'upgrade' | 'downgrade' | 'cancel' | 'cancel_now' | 'reactivate',
    targetTier?: string
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription-v2', {
        body: { 
          action,
          targetTier,
          when: action === 'cancel' ? 'period_end' : action === 'cancel_now' ? 'now' : undefined
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: t.error_generic,
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t.subs_toast_success || t.common_success,
        description: data.message || t.common_success,
      });

      await loadSubscriptionStatus();
      onSubscriptionUpdated?.();
    } catch (error) {
      console.error('Error managing subscription:', error);
      toast({
        title: t.error_generic,
        description: t.error_generic,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If free user, show plan picker
  if (showPlans) {
    return (
      <SubscriptionPlans 
        open={open} 
        onOpenChange={onOpenChange}
      />
    );
  }

  if (!status) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px] max-h-[80vh] overflow-y-auto glass-strong border-primary/30">
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const canUpgrade = status.tier === 'premium' && !status.isTrial;
  const canDowngrade = status.tier === 'vip' && !status.isTrial;
  const canReactivate = status.cancelAtPeriodEnd;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto glass-strong border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl flex items-center gap-2">
            <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-primary animate-pulse-glow" />
            <GradientText variant="hero">{t.subs_manage_title}</GradientText>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t.subs_note_inline}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Status Card */}
          <AnimatedCard className="p-6 bg-gradient-to-br from-background to-primary/5 border-primary/30">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">{t.subs_manage_currentPlan}</p>
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Crown className="w-6 h-6 text-primary" />
                  {status.tier === 'premium' && t.subscription_plan_premium}
                  {status.tier === 'vip' && t.subscription_plan_vip}
                  {status.isTrial && ` (${t.trial_active.split(' ')[0]})`}
                </h3>
              </div>

              {status.paymentMethodLast4 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="w-4 h-4" />
                  <span>•••• {status.paymentMethodLast4}</span>
                </div>
              )}

              {status.isTrial && status.trialEnd && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <span className="text-amber-500 font-medium">
                    {t.subs_manage_trialEnds.replace('{date}', format(new Date(status.trialEnd), 'PPP'))}
                  </span>
                </div>
              )}

              {!status.isTrial && status.currentPeriodEnd && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {status.cancelAtPeriodEnd 
                      ? `${t.subs_status_cancels} ${format(new Date(status.currentPeriodEnd), 'PPP')}`
                      : t.subs_manage_renews.replace('{date}', format(new Date(status.currentPeriodEnd), 'PPP'))
                    }
                  </span>
                </div>
              )}
            </div>
          </AnimatedCard>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Upgrade Button */}
            {canUpgrade && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white border-0 shadow-glow h-12"
                  >
                    <ArrowUp className="w-5 h-5 mr-2" />
                    {t.subs_action_upgrade} VIP
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.subs_confirm_title}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t.subs_confirm_upgrade.replace('{tier}', 'VIP')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleAction('upgrade', 'vip')}>
                      {t.subs_action_upgrade}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Downgrade Button */}
            {canDowngrade && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={isLoading}
                    variant="outline"
                    className="w-full h-12"
                  >
                    <ArrowDown className="w-5 h-5 mr-2" />
                    {t.subs_action_downgrade} Premium
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.subs_confirm_title}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t.subs_confirm_downgrade.replace('{tier}', 'Premium')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleAction('downgrade', 'premium')}>
                      {t.subs_action_downgrade}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Reactivate Button */}
            {canReactivate && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={isLoading}
                    variant="default"
                    className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    <RotateCcw className="w-5 h-5 mr-2" />
                    {t.subs_action_reactivate}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.subs_confirm_title}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t.subs_confirm_reactivate}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleAction('reactivate')}>
                      {t.subs_action_reactivate}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Cancel Button */}
            {!status.cancelAtPeriodEnd && !status.isTrial && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={isLoading}
                    variant="destructive"
                    className="w-full h-12"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    {t.subs_action_cancel}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.subs_confirm_title}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t.subs_confirm_cancel_periodEnd.replace('{date}', status.currentPeriodEnd ? format(new Date(status.currentPeriodEnd), 'PPP') : '')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleAction('cancel')}>
                      {t.subs_action_cancelAtPeriodEnd}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Cancel Trial Button */}
            {status.isTrial && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={isLoading}
                    variant="destructive"
                    className="w-full h-12"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    {t.subs_action_cancelTrial}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.subs_confirm_title}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t.subs_confirm_cancel_now}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleAction('cancel_now')}>
                      {t.subs_action_cancelNow}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* Inline Note */}
          <p className="text-xs text-center text-muted-foreground px-4">
            {t.subs_note_inline}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageSubscriptionDialog;
