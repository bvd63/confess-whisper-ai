import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/translated-dialog";
import { GradientText } from "@/components/GradientText";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Sparkles, Check, Crown, Loader2, Zap, ArrowUp, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedCard } from "./AnimatedCard";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SubscriptionCard from "./SubscriptionCard";

interface SubscriptionPlansProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
}

const SubscriptionPlans = ({ open, onOpenChange }: SubscriptionPlansProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentTier, setCurrentTier] = useState("free");
  const [isTrial, setIsTrial] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (open) {
      loadPlans();
      loadCurrentSubscription();
    }
  }, [open]);

  const loadPlans = async () => {
    const { data } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price_monthly', { ascending: true });
    
    if (data) {
      const typedPlans = data.map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : []
      })) as SubscriptionPlan[];
      setPlans(typedPlans);
    }
  };

  const loadCurrentSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, trial_active, trial_end_date')
      .eq('user_id', user.id)
      .single();
    
    if (profile) {
      // If user is on active trial, treat them as premium for UI purposes
      const trialValid = profile.trial_active && profile.trial_end_date && new Date(profile.trial_end_date) > new Date();
      const tier = trialValid ? 'premium' : (profile.subscription_tier || 'free');
      setCurrentTier(tier);
      setIsTrial(!!trialValid);
    }
  };

  const handleSubscribe = async (planId: string, cycle: "monthly" | "yearly") => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: t.reaction_auth_required,
          description: t.reaction_auth_required_desc,
          variant: "destructive",
        });
        return;
      }

      const plan = plans.find(p => p.id === planId);
      if (!plan) return;

      const priceId = cycle === 'monthly' 
        ? plan.stripe_price_id_monthly 
        : plan.stripe_price_id_yearly;

      if (!priceId) {
        toast({
          title: t.common_error,
          description: t.subscription_plan_unavailable,
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { 
          priceId,
          planName: plan.name,
          billingCycle: cycle
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Show success message based on plan
        const isPremium = plan.name.toLowerCase().includes('premium');
        const isVIP = plan.name.toLowerCase().includes('vip');
        
        toast({
          title: isVIP ? t.plans_vip_activated : (isPremium ? t.plans_premium_activated : t.common_success),
          description: isVIP ? t.plans_vip_welcome : (isPremium ? t.plans_premium_welcome : ''),
        });
        
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: t.common_error,
        description: t.subscription_payment_error_desc,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrialActivation = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: t.reaction_auth_required,
          description: t.reaction_auth_required_desc,
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('activate-trial');

      if (error) throw error;

      if (data?.alreadyUsed) {
        toast({
          title: t.trial_already_used_title || "Trial Already Used",
          description: t.trial_already_used_desc || "You've already used your free trial.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t.trial_activated_title || "🎉 Premium Trial Activated!",
        description: t.trial_activated_desc || "Enjoy 3 days of Premium features for free!",
      });

      // Reload to update UI
      await loadCurrentSubscription();
      onOpenChange(false);
    } catch (error) {
      console.error('Error activating trial:', error);
      toast({
        title: t.common_error,
        description: t.trial_activation_error || "Could not activate trial. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async (action: 'upgrade' | 'cancel') => {
    setIsLoading(true);
    try {
      // Open Stripe Customer Portal for managing subscription (upgrade/cancel)
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      if (data?.url) {
        toast({
          title: t.success,
          description: "Opening subscription portal...",
        });
        window.open(data.url, '_blank');
      } else {
        toast({
          title: t.error_generic,
          description: t.error_generic,
          variant: "destructive",
        });
      }

      await loadCurrentSubscription();
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: t.error_generic,
        description: t.error_generic,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto glass-strong border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl md:text-3xl flex items-center gap-2 justify-center">
            <Crown className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-primary animate-pulse-glow" />
            <GradientText variant="hero">{t.plans_paywall_title || "Choose your subscription plan"}</GradientText>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-center text-muted-foreground">
            {t.plans_paywall_subtitle || "Compare features and find your best experience."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Manage Subscription Section - for paid users */}
          {(currentTier === 'premium' || currentTier === 'vip') && !isTrial && (
            <div className="px-3 sm:px-0">
              <AnimatedCard className="p-4 sm:p-6 bg-gradient-to-br from-background to-primary/5 border-primary/30">
                <h3 className="text-lg sm:text-xl font-bold mb-4 text-center">
                  {t.subs_manage || "Manage subscription"}
                </h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  {t.subscription_description || "Unlock all features and get a superior experience"}
                </p>
                <div className="space-y-3">
                  {/* Upgrade to VIP button - only for Premium users */}
                  {currentTier === 'premium' && (
                    <Button
                      onClick={() => handleManageSubscription('upgrade')}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white border-0 shadow-glow h-12 text-base"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <ArrowUp className="w-5 h-5 mr-2" />
                      )}
                      {t.subs_upgrade || "Upgrade"} VIP
                    </Button>
                  )}
                  
                  {/* Cancel subscription button - for all paid users */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        disabled={isLoading}
                        variant="destructive"
                        className="w-full h-12 text-base bg-red-500 hover:bg-red-600"
                      >
                        <XCircle className="w-5 h-5 mr-2" />
                        {t.subs_cancel || "Cancel subscription"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t.subs_cancel || "Cancel subscription"}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t.subscription_cancel_confirm || "Are you sure you want to cancel your subscription? You'll lose access to all premium features at the end of your billing period."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t.cancel || "Cancel"}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleManageSubscription('cancel')}>
                          {t.subs_cancel || "Cancel subscription"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </AnimatedCard>
            </div>
          )}

          {/* Trial Button - only show for truly free users (not on trial) */}
          {currentTier === 'free' && (
            <div className="px-3 sm:px-0">
              <AnimatedCard className="p-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30">
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-semibold text-sm sm:text-base flex items-center justify-center sm:justify-start gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500 animate-pulse-glow" />
                      {t.trial_offer_title || "Try Premium Free!"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.trial_offer_desc || "Get full Premium access for 3 days, no credit card required"}
                    </p>
                  </div>
                  <Button 
                    onClick={handleTrialActivation} 
                    disabled={isLoading}
                    className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white border-0 shadow-glow"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    {t.trial_button_text || "Try 3 Days Free"}
                  </Button>
                </div>
              </AnimatedCard>
            </div>
          )}

          {/* Billing Cycle Toggle */}
          <div className="flex justify-center px-3 sm:px-0">
            <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as "monthly" | "yearly")} className="w-full max-w-md">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 h-9 sm:h-10">
                <TabsTrigger value="monthly" className="text-xs sm:text-sm">{t.subscription_monthly}</TabsTrigger>
                <TabsTrigger value="yearly" className="relative text-xs sm:text-sm">
                  {t.subscription_yearly}
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[8px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded-full">
                    {t.subscription_yearly_discount}
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Subscription Cards */}
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6 px-3 sm:px-0">
            {plans.map((plan) => (
              <SubscriptionCard
                key={plan.id}
                plan={plan}
                currentTier={currentTier}
                billingCycle={billingCycle}
                onSubscribe={handleSubscribe}
                loading={isLoading}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionPlans;