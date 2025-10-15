import { Card } from "@/components/ui/card";
import { Sparkles, Shield, Heart, Zap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const FeatureHighlight = () => {
  const { t } = useLanguage();
  
  const features = [
    {
      icon: Heart,
      title: t.feature_ai_empathy,
      description: t.feature_ai_empathy_desc
    },
    {
      icon: Shield,
      title: t.feature_anonymous,
      description: t.feature_anonymous_desc
    },
    {
      icon: Sparkles,
      title: t.feature_deep_insights,
      description: t.feature_deep_insights_desc
    },
    {
      icon: Zap,
      title: t.feature_instant_response,
      description: t.feature_instant_response_desc
    }
  ];

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 my-8 animate-fade-in">
      {features.map((feature, index) => {
        const Icon = feature.icon;
        return (
          <Card
            key={index}
            className="p-5 bg-gradient-to-br from-card to-muted/20 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-[var(--shadow-glow)] group"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="mb-3 inline-flex p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
              {feature.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {feature.description}
            </p>
          </Card>
        );
      })}
    </div>
  );
};

export default FeatureHighlight;
