import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Check, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface ModernVIPCardProps {
  isVIP?: boolean;
  onUpgrade?: () => void;
  className?: string;
}

/**
 * Modern VIP upgrade card with premium aesthetics
 * Instagram/Facebook-style premium card
 */
export const ModernVIPCard = ({ isVIP, onUpgrade, className }: ModernVIPCardProps) => {
  const { t } = useLanguage();

  const benefits = [
    t.plans_vip_benefit_unlimited_ai,
    t.plans_vip_benefit_no_ads,
    t.plans_vip_benefit_priority_support,
    t.plans_vip_benefit_special_badge,
  ];

  if (isVIP) {
    return (
      <Card className={cn(
        "relative overflow-hidden glass-strong border-2 border-primary/30",
        className
      )}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        
        <div className="relative p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 mb-4 shadow-glow">
            <Crown className="w-8 h-8 text-white" />
          </div>
          
          <h3 className="text-2xl font-bold mb-2 gradient-text">
            {t.vip_member}
          </h3>
          
          <p className="text-sm text-muted-foreground mb-4">
            {t.profile_you_are_vip}
          </p>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>{t.vip_feature}</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "relative overflow-hidden border-2 border-border hover:border-primary/50 transition-all duration-300 group",
      className
    )}>
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative p-6">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-4 group-hover:scale-110 transition-transform duration-300">
          <Crown className="w-7 h-7 text-primary" />
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold mb-2 text-foreground">
          {t.subscription_vip_title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-6">
          {t.profile_vip_description}
        </p>

        {/* Benefits List */}
        <div className="space-y-3 mb-6">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <Check className="w-3 h-3 text-primary" />
              </div>
              <span className="text-sm text-foreground">{benefit}</span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <Button
          onClick={onUpgrade}
          className="w-full h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white font-semibold shadow-elegant hover:shadow-glow transition-all duration-300"
        >
          <Crown className="w-4 h-4 mr-2" />
          {t.upgrade_now}
        </Button>
      </div>
    </Card>
  );
};