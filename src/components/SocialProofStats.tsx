import { Card } from "@/components/ui/card";
import { TrendingUp, Users, Heart, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCountUp } from "@/hooks/useCountUp";

interface StatsData {
  totalUsers?: number;
  totalConfessions?: number;
  totalLikes?: number;
  premiumUsers?: number;
}

interface StatsCardProps {
  stats: StatsData;
}

const StatCard = ({ 
  stat, 
  index 
}: { 
  stat: any; 
  index: number;
}) => {
  const Icon = stat.icon;
  
  // Parse the number from the value string (e.g., "1,200+" -> 1200)
  const targetValue = typeof stat.value === 'number' 
    ? stat.value 
    : parseInt(stat.value.toString().replace(/[^0-9]/g, '')) || 0;
  
  const hasPlus = typeof stat.value === 'string' && stat.value.includes('+');
  
  const { formattedCount, elementRef } = useCountUp({
    end: targetValue,
    duration: 2500,
    separator: ','
  });

  return (
    <Card
      ref={elementRef}
      className="p-4 bg-gradient-to-br from-card to-muted/30 border-border/50 hover:border-primary/30 transition-all animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${stat.bgColor}`}>
          <Icon className={`w-5 h-5 ${stat.color}`} />
        </div>
        <div>
          <div className={`text-xl font-bold ${stat.color} tabular-nums`}>
            {formattedCount}{hasPlus && '+'}
          </div>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
        </div>
      </div>
    </Card>
  );
};

const SocialProofStats = ({ stats }: StatsCardProps) => {
  const { t } = useLanguage();
  
  const displayStats = [
    {
      icon: Users,
      value: stats.totalUsers || 1200,
      label: t.stats_active_users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: Heart,
      value: stats.totalConfessions || 5800,
      label: t.stats_confessions_shared,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: TrendingUp,
      value: stats.totalLikes || 12400,
      label: t.stats_empathetic_reactions,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      icon: Sparkles,
      value: stats.premiumUsers || 280,
      label: t.stats_premium_members,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {displayStats.map((stat, index) => (
        <StatCard key={index} stat={stat} index={index} />
      ))}
    </div>
  );
};

export default SocialProofStats;