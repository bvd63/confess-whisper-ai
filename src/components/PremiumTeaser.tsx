import { AnimatedCard } from "@/components/AnimatedCard";
import { Button } from "@/components/ui/button";
import { Sparkles, Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface PremiumTeaserProps {
  feature: string;
  description: string;
  onUpgrade: () => void;
  className?: string;
}

export const PremiumTeaser = ({ feature, description, onUpgrade, className }: PremiumTeaserProps) => {
  const { t } = useLanguage();

  return (
    <AnimatedCard 
      className={cn("p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20", className)}
      hover="lift"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-full bg-primary/10">
          <Lock className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
            {feature}
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          </h3>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          <Button 
            onClick={onUpgrade}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            size="sm"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {t.teaser_unlock}
          </Button>
        </div>
      </div>
    </AnimatedCard>
  );
};
