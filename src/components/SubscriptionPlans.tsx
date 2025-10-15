import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Crown, Loader2, Zap } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionPlansProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLANS = {
  monthly: {
    priceId: 'price_1SIVcRR7kygIyYg9aPdkdzCD',
    productId: 'prod_TEzb0QzrMOVFe6',
    price: '$4.99',
    interval: 'lună',
    savings: null,
  },
  yearly: {
    priceId: 'price_1SIVcgR7kygIyYg9fvcIPq5R',
    productId: 'prod_TEzbwHO3zir2dE',
    price: '$39.99',
    interval: 'an',
    savings: 'Economisești 40%',
  },
};

const SubscriptionPlans = ({ open, onOpenChange }: SubscriptionPlansProps) => {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubscribe = async (planKey: 'monthly' | 'yearly') => {
    setIsLoading(planKey);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Eroare",
          description: "Trebuie să fii autentificat pentru a te abona.",
          variant: "destructive",
        });
        return;
      }

      const plan = PLANS[planKey];
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId: plan.priceId },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut iniția procesul de abonare. Încearcă din nou.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const benefits = [
    "Deep Insight AI nelimitat - analize psihologice profunde",
    "Răspunsuri AI extinse și mai detaliate",
    "Fără reclame - experiență curată",
    "Prioritate în procesare AI",
    "Acces la funcții viitoare"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-gradient-to-br from-card via-primary/5 to-card border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-3xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent flex items-center gap-2">
            <Crown className="w-7 h-7 text-primary" />
            Confess+ Premium
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Alege planul care ți se potrivește cel mai bine
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Benefits */}
          <div className="space-y-3">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="mt-0.5 p-1 rounded-full bg-primary/20">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm text-foreground/90">{benefit}</p>
              </div>
            ))}
          </div>

          {/* Pricing Plans */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Monthly Plan */}
            <div className="p-6 bg-card rounded-xl border border-border hover:border-primary/50 transition-all">
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Lunar</h3>
                </div>
                <div className="text-3xl font-bold text-primary mb-1">{PLANS.monthly.price}</div>
                <div className="text-sm text-muted-foreground">pe {PLANS.monthly.interval}</div>
              </div>
              <Button
                onClick={() => handleSubscribe('monthly')}
                disabled={isLoading !== null}
                className="w-full bg-gradient-to-r from-primary/80 to-primary/60 hover:from-primary/90 hover:to-primary/70 text-primary-foreground"
              >
                {isLoading === 'monthly' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Procesare...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Abonează-te
                  </>
                )}
              </Button>
            </div>

            {/* Yearly Plan - Highlighted */}
            <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border-2 border-primary relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                CEL MAI POPULAR
              </div>
              <div className="text-center mb-4 mt-2">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Anual</h3>
                </div>
                <div className="text-3xl font-bold text-primary mb-1">{PLANS.yearly.price}</div>
                <div className="text-sm text-muted-foreground mb-1">pe {PLANS.yearly.interval}</div>
                <div className="text-xs font-semibold text-primary">{PLANS.yearly.savings}</div>
              </div>
              <Button
                onClick={() => handleSubscribe('yearly')}
                disabled={isLoading !== null}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-[var(--shadow-glow)] animate-glow"
              >
                {isLoading === 'yearly' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Procesare...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Abonează-te Anual
                  </>
                )}
              </Button>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Poți anula oricând din setările contului. Fără obligații pe termen lung.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionPlans;