import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AnimatedCard } from "./AnimatedCard";
import { GradientText } from "./GradientText";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowUp, ArrowDown, XCircle, RotateCcw, Loader2, Crown, CreditCard, Calendar, ShoppingCart, Zap } from "lucide-react";
import { format } from "date-fns";
import { SubscriptionPlansGrid } from "./SubscriptionPlansGrid";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [selectedBuyTier, setSelectedBuyTier] = useState<'premium' | 'vip'>('premium');
  const [trialEligible, setTrialEligible] = useState(false);
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

      const { data, error } = await supabase.functions.invoke('billing-status');
      if (error) throw error;

      const mapped = {
        tier: data.current_plan || 'free',
        isTrial: data.status === 'trialing',
        currentPeriodEnd: data.current_period_end || null,
        trialEnd: data.status === 'trialing' ? data.current_period_end : null,
        cancelAtPeriodEnd: !!data.cancel_at_period_end,
        paymentMethodLast4: null,
      } as SubscriptionStatus;

      setStatus(mapped);
      
      // Check trial eligibility from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('trial_premium_used')
        .eq('user_id', user.id)
        .single();
      
      const eligible = !profile?.trial_premium_used && data.tier === 'free' && !data.isTrial;
      setTrialEligible(eligible);
      
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

  const handleOpenCustomerPortal = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        // Open Stripe Customer Portal in new tab
        window.open(data.url, '_blank');
        toast({
          title: t.common_success || "Success",
          description: t.subs_portal_opening,
        });
      }
    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      toast({
        title: t.error_generic,
        description: error?.message || t.subs_portal_failed,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuy = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('billing-buy', {
        body: { 
          tier: selectedBuyTier,
          cycle: 'monthly'
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

      if (data?.url) {
        toast({
          title: t.subs_toast_buy_success,
          description: t.common_success,
        });
        window.open(data.url, '_blank');
        setShowBuyDialog(false);
        await loadSubscriptionStatus();
        onSubscriptionUpdated?.();
      }
    } catch (error: any) {
      console.error('Error buying subscription:', error);
      toast({
        title: t.error_generic,
        description: error?.message || t.error_generic,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrialStart = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-trial-checkout');

      if (error) throw error;

      if (data?.error) {
        toast({
          title: t.error_generic,
          description: data.message || t.subs_error_no_trial,
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
        setShowBuyDialog(false);
        await loadSubscriptionStatus();
        onSubscriptionUpdated?.();
      }
    } catch (error: any) {
      console.error('Error starting trial:', error);
      toast({
        title: t.error_generic,
        description: error?.message || t.error_generic,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = async (targetTier: 'premium' | 'vip') => {
    console.log('[CHANGE] Starting change to:', targetTier);
    setIsLoading(true);
    try {
      console.log('[CHANGE] Invoking billing-change function');
      const { data, error } = await supabase.functions.invoke('billing-change', {
        body: { targetTier }
      });

      console.log('[CHANGE] Response:', { data, error });
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
        description: t.subs_toast_change_success,
      });

      await loadSubscriptionStatus();
      onSubscriptionUpdated?.();
    } catch (error: any) {
      console.error('Error changing subscription:', error);
      toast({
        title: t.error_generic,
        description: error?.message || t.error_generic,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (immediate: boolean = false) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('billing-cancel', {
        body: { immediate }
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
        description: immediate ? t.subs_toast_cancel_now_success : t.subs_toast_cancel_success,
      });

      await loadSubscriptionStatus();
      onSubscriptionUpdated?.();
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      toast({
        title: t.error_generic,
        description: error?.message || t.error_generic,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactivate = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('billing-reactivate');

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
        description: t.subs_toast_reactivate_success,
      });

      await loadSubscriptionStatus();
      onSubscriptionUpdated?.();
    } catch (error: any) {
      console.error('Error reactivating subscription:', error);
      toast({
        title: t.error_generic,
        description: error?.message || t.error_generic,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelect = async (planId: string) => {
    if (planId === 'free') {
      // Downgrade to free - this is a cancel action
      await handleCancel(false);
    } else if (planId === status?.tier) {
      // Already on this plan, do nothing
      return;
    } else if (status?.tier === 'free') {
      // Buying from free
      setSelectedBuyTier(planId as 'premium' | 'vip');
      setShowBuyDialog(true);
    } else {
      // Changing between premium/vip
      await handleChange(planId as 'premium' | 'vip');
    }
  };

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

  const isFreeUser = status.tier === 'free' && !status.isTrial;
  const hasActiveSubscription = ['premium', 'vip'].includes(status.tier) && !!status.currentPeriodEnd && !status.isTrial;
  const showBuyButton = isFreeUser;
  const showChangeButton = hasActiveSubscription;
  const showCancelButton = hasActiveSubscription && !status.cancelAtPeriodEnd;
  const showReactivateButton = !isFreeUser && status.cancelAtPeriodEnd && !!status.currentPeriodEnd;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto glass-strong border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl flex items-center gap-2">
            <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-primary animate-pulse-glow" />
            <GradientText variant="hero">{t.subs_manage_title}</GradientText>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t.subscription_choose_plan}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="plans" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plans">{t.subscription_choose_plan}</TabsTrigger>
            <TabsTrigger value="status">{t.subs_manage_currentPlan}</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-6 py-4">
            {/* Plans Grid */}
            <SubscriptionPlansGrid
              currentPlan={status?.tier || 'free'}
              onSelectPlan={handlePlanSelect}
              isLoading={isLoading}
              canChangePlan={!status?.isTrial}
              trialEligible={trialEligible}
            />

            {/* Buy Dialog for confirmation */}
            <AlertDialog open={showBuyDialog} onOpenChange={setShowBuyDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.subs_buy_select_plan}</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-4">
                    <p>{t.subs_confirm_buy.replace('{tier}', selectedBuyTier.toUpperCase())}</p>
                    
                    {trialEligible && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <p className="text-sm text-amber-600 dark:text-amber-400 font-medium flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          {t.subs_buy_trial_available}
                        </p>
                      </div>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  {trialEligible && (
                    <Button
                      onClick={handleTrialStart}
                      disabled={isLoading}
                      className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                      Try 3 Days Free
                    </Button>
                  )}
                  <AlertDialogCancel disabled={isLoading}>{t.cancel}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBuy} disabled={isLoading}>
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {t.subs_action_buy}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          <TabsContent value="status" className="space-y-6 py-4">
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

          {/* Stripe Customer Portal Button - Full Management */}
          {!status.isTrial && (
            <AnimatedCard className="p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/30">
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <h4 className="font-semibold text-sm">{t.subs_full_management}</h4>
                  <p className="text-xs text-muted-foreground">
                    {t.subs_portal_description}
                  </p>
                  <Button
                    onClick={handleOpenCustomerPortal}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4 mr-2" />
                    )}
                    {t.subs_open_portal}
                  </Button>
                </div>
              </div>
            </AnimatedCard>
          )}

          {/* Quick Action Buttons */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="h-px flex-1 bg-border"></div>
              <span className="text-xs text-muted-foreground font-medium">{t.subs_quick_actions}</span>
              <div className="h-px flex-1 bg-border"></div>
            </div>

            {/* Buy Button - Only for free users */}
            {showBuyButton && (
              <AlertDialog open={showBuyDialog} onOpenChange={setShowBuyDialog}>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 shadow-glow h-12"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    {t.subs_action_buy}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.subs_buy_select_plan}</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4">
                      <p>{t.subs_confirm_buy.replace('{tier}', selectedBuyTier.toUpperCase())}</p>
                      
                      {trialEligible && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            {t.subs_buy_trial_available}
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Select Plan:</label>
                        <Select value={selectedBuyTier} onValueChange={(v) => setSelectedBuyTier(v as 'premium' | 'vip')}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="premium">Premium</SelectItem>
                            <SelectItem value="vip">VIP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    {trialEligible && (
                      <Button
                        onClick={handleTrialStart}
                        disabled={isLoading}
                        className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                        Try 3 Days Free
                      </Button>
                    )}
                    <AlertDialogCancel disabled={isLoading}>{t.cancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBuy} disabled={isLoading}>
                      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {t.subs_action_buy}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            
            {/* Change Button - Switch between Premium and VIP */}
            {showChangeButton && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white border-0 shadow-glow h-12"
                  >
                    <RotateCcw className="w-5 h-5 mr-2" />
                    {t.subs_action_change}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.subs_confirm_title}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {status.tier === 'premium' 
                        ? t.subs_confirm_change_to_vip
                        : t.subs_confirm_change_to_premium
                      }
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>{t.cancel}</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleChange(status.tier === 'premium' ? 'vip' : 'premium')}
                      disabled={isLoading}
                    >
                      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {t.subs_action_change}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Cancel Button */}
            {showCancelButton && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={isLoading}
                    variant="outline"
                    className="w-full h-12 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    {t.subs_action_cancel}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.subs_confirm_title}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t.subs_confirm_cancel}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel disabled={isLoading}>{t.common_cancel}</AlertDialogCancel>
                    <Button
                      onClick={() => handleCancel(true)}
                      disabled={isLoading}
                      variant="outline"
                      className="border-orange-500/50 text-orange-600 hover:bg-orange-500/10"
                    >
                      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {t.subs_cancel_immediate}
                    </Button>
                    <AlertDialogAction 
                      onClick={() => handleCancel(false)}
                      disabled={isLoading}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {t.subs_cancel_at_period_end}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Reactivate Button */}
            {showReactivateButton && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 shadow-glow h-12"
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
                    <AlertDialogCancel disabled={isLoading}>{t.cancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReactivate} disabled={isLoading}>
                      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {t.subs_action_reactivate}
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ManageSubscriptionDialog;
