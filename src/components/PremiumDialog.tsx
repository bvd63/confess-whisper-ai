import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Crown } from "lucide-react";

interface PremiumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade: () => void;
}

const PremiumDialog = ({ open, onOpenChange, onUpgrade }: PremiumDialogProps) => {
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
              onClick={onUpgrade}
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-[var(--shadow-glow)] animate-glow"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade la Premium
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
