import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/translated-dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Crown, Loader2, Zap } from "lucide-react";
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
        window.location.href = data.url;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-gradient-to-br from-card via-primary/5 to-card border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-3xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent flex items-center gap-2">
            <Crown className="w-7 h-7 text-primary" />
            {t.subscription_title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t.subscription_description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Billing Cycle Toggle */}
          <div className="flex justify-center">
            <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as "monthly" | "yearly")} className="w-full max-w-md">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                <TabsTrigger value="monthly">{t.subscription_monthly}</TabsTrigger>
                <TabsTrigger value="yearly" className="relative">
                  {t.subscription_yearly}
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {t.subscription_yearly_discount}
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Subscription Cards */}
          <div className="grid md:grid-cols-2 gap-6">
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

          <p className="text-xs text-center text-muted-foreground">
            {t.subscription_cancel_anytime}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionPlans;