import { Shield, Lock, Eye, CheckCircle } from "lucide-react";

const TrustBadges = () => {
  const badges = [
    {
      icon: Shield,
      title: "100% Anonim",
      description: "Identitatea ta rămâne confidențială",
    },
    {
      icon: Lock,
      title: "Securizat SSL",
      description: "Toate datele sunt criptate",
    },
    {
      icon: Eye,
      title: "Moderare AI",
      description: "Conținut verificat automat",
    },
    {
      icon: CheckCircle,
      title: "Comunitate Sigură",
      description: "Spațiu fără judecată",
    },
  ];

  return (
    <div className="py-8 border-t border-border/50">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
        {badges.map((badge, index) => {
          const Icon = badge.icon;
          return (
            <div
              key={index}
              className="flex flex-col items-center text-center gap-2 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="p-3 rounded-full bg-primary/10">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{badge.title}</p>
                <p className="text-xs text-muted-foreground">
                  {badge.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrustBadges;