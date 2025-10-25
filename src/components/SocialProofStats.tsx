import { Card } from "@/components/ui/card";
import { TrendingUp, Users, Heart, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface StatsData {
  totalUsers?: number;
  totalConfessions?: number;
  totalLikes?: number;
  vipUsers?: number;
}

interface StatsCardProps {
  stats: StatsData;
}

const SocialProofStats = ({ stats }: StatsCardProps) => {
  const { t } = useLanguage();
  
  const displayStats = [
    {
      icon: Users,
      value: stats.totalUsers || "1,200+",
      label: t.stats_active_users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: Heart,
      value: stats.totalConfessions || "5,800+",
      label: t.stats_confessions_shared,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: TrendingUp,
      value: stats.totalLikes || "12,400+",
      label: t.stats_empathetic_reactions,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      icon: Sparkles,
      value: stats.vipUsers || "280+",
      label: t.stats_vip_members,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {displayStats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={index}
            className="p-4 bg-gradient-to-br from-card to-muted/30 border-border/50 hover:border-primary/30 transition-all animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <div className={`text-xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default SocialProofStats;