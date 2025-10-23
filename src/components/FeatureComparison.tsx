import { AnimatedCard } from "@/components/AnimatedCard";
import { Check, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

interface FeatureComparisonProps {
  onUpgrade: () => void;
}

export const FeatureComparison = ({ onUpgrade }: FeatureComparisonProps) => {
  const { t } = useLanguage();

  const features = [
    { name: t.comparison_daily_confessions, free: "3", vip: t.comparison_unlimited },
    { name: t.comparison_ai_responses, free: true, vip: true },
    { name: t.comparison_deep_insights, free: false, vip: true },
    { name: t.comparison_analytics, free: false, vip: true },
    { name: t.comparison_boost, free: false, vip: true },
    { name: t.comparison_priority_support, free: false, vip: true },
    { name: t.comparison_custom_badge, free: false, vip: true },
  ];

  return (
    <AnimatedCard className="p-6" hover="none">
      <h2 className="text-2xl font-bold text-center mb-6">{t.comparison_title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-2">{t.comparison_feature}</th>
              <th className="text-center py-3 px-2">{t.subscription_tier_free}</th>
              <th className="text-center py-3 px-2 bg-primary/10">{t.subscription_tier_vip}</th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature, idx) => (
              <tr key={idx} className="border-b">
                <td className="py-3 px-2 text-sm">{feature.name}</td>
                <td className="text-center py-3 px-2">
                  {typeof feature.free === 'boolean' ? (
                    feature.free ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-muted-foreground mx-auto" />
                  ) : (
                    <span className="text-sm">{feature.free}</span>
                  )}
                </td>
                <td className="text-center py-3 px-2 bg-primary/10">
                  {typeof feature.vip === 'boolean' ? (
                    feature.vip ? <Check className="w-4 h-4 text-primary mx-auto" /> : <X className="w-4 h-4 text-muted-foreground mx-auto" />
                  ) : (
                    <span className="text-sm font-bold text-primary">{feature.vip}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 text-center">
        <Button 
          onClick={onUpgrade}
          size="lg"
          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
        >
          {t.comparison_upgrade_now}
        </Button>
      </div>
    </AnimatedCard>
  );
};
