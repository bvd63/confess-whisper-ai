import { AnimatedCard } from "@/components/AnimatedCard";
import { EnhancedButton } from "@/components/EnhancedButton";
import { FloatingElement } from "@/components/FloatingElement";
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
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const displayPrice = billingCycle === "monthly" 
    ? formatCurrency(price / 100)
    : formatCurrency(price / 100 / 12);

  const featureTranslationMap: Record<string, string> = {
    // Confession limits
    "3 confessions per day": "plans_free_benefit_confessions",
    "10 confessions per day": "plans_premium_benefit_confessions",
    "Unlimited confessions per day": "plans_vip_benefit_confessions",
    // Basic features
    "Basic features": "plans_free_benefit_basic",
    "Ads enabled": "plans_free_benefit_ads",
    // Premium features
    "Unlimited AI responses": "plans_premium_benefit_ai",
    "Advanced analytics": "plans_premium_benefit_analytics",
    "Exclusive Premium badge": "plans_premium_benefit_badge",
    "No ads": "plans_premium_benefit_noads",
    "Priority in moderation": "plans_premium_benefit_priority",
    // VIP features
    "All Premium benefits": "plans_vip_benefit_allpremium",
    "Image confessions": "plans_vip_benefit_images",
    "Detailed statistics": "plans_vip_benefit_stats",
    "Priority support": "plans_vip_benefit_support",
    "Special VIP badge": "plans_vip_benefit_badge",
    // Romanian features (legacy)
    "Răspunsuri AI nelimitate": "plans_premium_benefit_ai",
    "Analize avansate": "plans_premium_benefit_analytics",
    "Badge-uri exclusive": "plans_premium_benefit_badge",
    "Fără reclame": "plans_premium_benefit_noads",
    "Prioritate în moderare": "plans_premium_benefit_priority",
    "Toate beneficiile Premium": "plans_vip_benefit_allpremium",
    "Confesiuni cu imagine": "plans_vip_benefit_images",
    "Statistici detaliate": "plans_vip_benefit_stats",
    "Suport prioritar": "plans_vip_benefit_support",
    "Badge VIP special": "plans_vip_benefit_badge",
  };

  const translateFeature = (feature: string): string => {
    const key = featureTranslationMap[feature] as keyof typeof t;
    return key ? t[key] : feature;
  };

  return (
    <AnimatedCard 
      hover="lift"
      glass={isVIP}
      gradient={isVIP}
      className={`p-6 relative overflow-hidden ${
        isVIP ? 'border-primary/50' : ''
      }`}
    >
      {isVIP && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-full" />
      )}
      
      {/* Discount Badge for Premium and VIP on yearly billing */}
      {billingCycle === "yearly" && (isPremium || isVIP) && (
        <FloatingElement delay={0.3}>
          <div className="absolute top-3 right-3 z-20 bg-primary text-primary-foreground font-bold rounded-full w-16 h-16 flex items-center justify-center text-lg shadow-elegant animate-pulse-glow">
            -33%
          </div>
        </FloatingElement>
      )}
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isPremium && (
              <FloatingElement delay={0.5}>
                <Crown className="w-5 h-5 text-primary" />
              </FloatingElement>
            )}
            {isVIP && (
              <FloatingElement delay={0.5}>
                <Sparkles className="w-5 h-5 text-primary animate-pulse-glow" />
              </FloatingElement>
            )}
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
              <span className="text-sm">{translateFeature(feature)}</span>
            </li>
          ))}
        </ul>

        <EnhancedButton
          onClick={() => onSubscribe(plan.id, billingCycle)}
          disabled={isCurrentPlan || loading}
          className="w-full"
          variant={isVIP ? "default" : "outline"}
          glow={isVIP}
          shine={isVIP}
          lift={!isCurrentPlan}
        >
          {isCurrentPlan ? t.subscription_active_plan : `${t.subscription_choose} ${plan.name}`}
        </EnhancedButton>
      </div>
    </AnimatedCard>
  );
};

export default SubscriptionCard;
