import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/translated-dialog";
import { GradientText } from "@/components/GradientText";
import { FloatingElement } from "@/components/FloatingElement";
import { Sparkles, Check, Crown, Loader2, Zap } from "lucide-react";
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
      .select('subscription_tier')
      .eq('user_id', user.id)
      .single();
    
    if (profile) {
      setCurrentTier(profile.subscription_tier || 'free');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto glass-strong border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl md:text-3xl flex items-center gap-2 justify-center">
            <FloatingElement delay={0.5}>
              <Crown className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-primary animate-pulse-glow" />
            </FloatingElement>
            <GradientText variant="hero">{t.plans_paywall_title || "Choose your subscription plan"}</GradientText>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-center text-muted-foreground">
            {t.plans_paywall_subtitle || "Compare features and find your best experience."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Trial Button */}
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

          <p className="text-[10px] sm:text-xs text-center text-muted-foreground px-3 sm:px-0">
            {t.subscription_cancel_anytime}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionPlans;