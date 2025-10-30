import { Shield, Lock, Eye, CheckCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const TrustBadges = () => {
  const { t } = useLanguage();
  
  const badges = [
    {
      icon: Shield,
      title: t.trust_anonymous,
      description: t.trust_anonymous_desc,
    },
    {
      icon: Lock,
      title: t.trust_ssl,
      description: t.trust_ssl_desc,
    },
    {
      icon: Eye,
      title: t.trust_moderation,
      description: t.trust_moderation_desc,
    },
    {
      icon: CheckCircle,
      title: t.trust_safe_community,
      description: t.trust_safe_community_desc,
    },
  ];

  return (
    <div className="py-6 sm:py-8 border-t border-border/50">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5 max-w-4xl mx-auto">
        {badges.map((badge, index) => {
          const Icon = badge.icon;
          return (
            <div
              key={index}
              className="flex flex-col items-center text-center gap-1.5 sm:gap-2 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="p-2 sm:p-2.5 rounded-full bg-primary/10">
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-xs sm:text-sm">{badge.title}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
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