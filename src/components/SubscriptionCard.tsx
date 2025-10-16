import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Crown, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

interface SubscriptionCardProps {
  plan: {
    id: string;
    name: string;
    price_monthly: number;
    price_yearly: number;
    features: string[];
  };
  currentTier: string;
  billingCycle: "monthly" | "yearly";
  onSubscribe: (planId: string, cycle: "monthly" | "yearly") => void;
  loading?: boolean;
}

const SubscriptionCard = ({ 
  plan, 
  currentTier, 
  billingCycle, 
  onSubscribe,
  loading 
}: SubscriptionCardProps) => {
  const { t } = useLanguage();
  const isCurrentPlan = currentTier === plan.name.toLowerCase();
  const isPremium = plan.name === "Premium";
  const isVIP = plan.name === "VIP";
  
  const price = billingCycle === "monthly" ? plan.price_monthly : plan.price_yearly;
  const formatCurrency = (amount: number) => `$${amount.toFixed(0)}`;
  const displayPrice = billingCycle === "monthly" 
    ? formatCurrency(price / 100)
    : formatCurrency(price / 100 / 12);

  return (
    <Card className={`p-6 relative overflow-hidden ${
      isVIP ? 'border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10' : ''
    }`}>
      {isVIP && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-full" />
      )}
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isPremium && <Crown className="w-5 h-5 text-primary" />}
            {isVIP && <Sparkles className="w-5 h-5 text-primary" />}
            <h3 className="text-2xl font-bold">{plan.name}</h3>
          </div>
          {isCurrentPlan && (
            <Badge variant="secondary">{t.subscription_active_plan}</Badge>
          )}
        </div>

        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-primary">{displayPrice}</span>
            <span className="text-muted-foreground">/{t.subscription_per_month}</span>
          </div>
          {billingCycle === "yearly" && (
            <p className="text-sm text-muted-foreground mt-1">
              {t.subscription_billed_yearly} ({formatCurrency(price / 100)}/{t.subscription_per_year})
            </p>
          )}
        </div>

        <ul className="space-y-3 mb-6">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          onClick={() => onSubscribe(plan.id, billingCycle)}
          disabled={isCurrentPlan || loading}
          className="w-full"
          variant={isVIP ? "default" : "outline"}
        >
          {isCurrentPlan ? t.subscription_active_plan : `${t.subscription_choose} ${plan.name}`}
        </Button>
      </div>
    </Card>
  );
};

export default SubscriptionCard;
