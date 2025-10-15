import { Card } from "@/components/ui/card";
import { Sparkles, Shield, Heart, Zap } from "lucide-react";

const FeatureHighlight = () => {
  const features = [
    {
      icon: Heart,
      title: "Empatie AI",
      description: "Răspunsuri empatice generate de AI antrenat să înțeleagă și să sprijine"
    },
    {
      icon: Shield,
      title: "100% Anonim",
      description: "Identitatea ta rămâne confidențială, confesiunile nu pot fi atribuite"
    },
    {
      icon: Sparkles,
      title: "Deep Insights",
      description: "Analize psihologice profunde pentru înțelegere completă (Premium)"
    },
    {
      icon: Zap,
      title: "Răspuns Instant",
      description: "Primești feedback imediat, disponibil 24/7 pentru când ai nevoie"
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
