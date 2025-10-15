import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Crown, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PremiumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade: () => void;
}

const PremiumDialog = ({ open, onOpenChange, onUpgrade }: PremiumDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Eroare",
          description: "Trebuie să fii autentificat pentru a face upgrade.",
          variant: "destructive",
        });
        return;
      }

      // Get Stripe price ID from environment or create product first
      const PRICE_ID = 'price_premium_monthly'; // Will be set after creating Stripe product
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId: PRICE_ID,
          userId: user.id,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut iniția procesul de upgrade. Încearcă din nou.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-card via-primary/5 to-card border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-3xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent flex items-center gap-2">
            <Crown className="w-7 h-7 text-primary" />
            Confess+ Premium
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Deblochează funcționalități premium pentru o experiență completă.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Benefits */}
          <div className="space-y-3">
            {[
              "Deep Insight AI nelimitat - analize psihologice profunde",
              "Răspunsuri AI extinse și mai detaliate",
              "Fără reclame - experiență curată",
              "Prioritate în procesare AI",
              "Acces la funcții viitoare"
            ].map((benefit, i) => (
              <div key={i} className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="mt-0.5 p-1 rounded-full bg-primary/20">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm text-foreground/90">{benefit}</p>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20">
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-primary mb-1">29 RON</div>
              <div className="text-sm text-muted-foreground">pe lună</div>
            </div>
            <Button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-[var(--shadow-glow)] animate-glow disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesare...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Upgrade la Premium
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Poți anula oricând. Fără obligații pe termen lung.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PremiumDialog;
