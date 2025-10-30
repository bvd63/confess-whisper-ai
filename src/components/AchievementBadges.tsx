import { Card } from "@/components/ui/card";
import { Award, Sparkles, Heart, MessageCircle, Crown, Flame, Star } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Achievement {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  unlocked: boolean;
  progress?: number;
  target?: number;
}

interface AchievementBadgesProps {
  totalConfessions: number;
  deepInsightsUsed: number;
  isPremium: boolean;
}

const AchievementBadges = ({ totalConfessions, deepInsightsUsed, isPremium }: AchievementBadgesProps) => {
  const { t } = useLanguage();
  
  const achievements: Achievement[] = [
    {
      id: 'first_confession',
      icon: MessageCircle,
      title: t.achievement_first_confession,
      description: t.achievement_first_confession_desc,
      unlocked: totalConfessions >= 1,
    },
    {
      id: 'frequent_user',
      icon: Flame,
      title: t.achievement_active_user,
      description: t.achievement_active_user_desc,
      unlocked: totalConfessions >= 10,
      progress: totalConfessions,
      target: 10,
    },
    {
      id: 'power_user',
      icon: Star,
      title: t.achievement_power_user,
      description: t.achievement_power_user_desc,
      unlocked: totalConfessions >= 50,
      progress: Math.min(totalConfessions, 50),
      target: 50,
    },
    {
      id: 'deep_thinker',
      icon: Sparkles,
      title: t.achievement_deep_thinker,
      description: t.achievement_deep_thinker_desc,
      unlocked: deepInsightsUsed >= 5,
      progress: deepInsightsUsed,
      target: 5,
    },
    {
      id: 'vip_member',
      icon: Crown,
      title: t.achievement_vip_member,
      description: t.achievement_vip_member_desc,
      unlocked: isPremium,
    },
    {
      id: 'supporter',
      icon: Heart,
      title: t.achievement_supporter,
      description: t.achievement_supporter_desc,
      unlocked: isPremium,
    },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <Card className="p-3 sm:p-4 bg-card border-border/50 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 sm:p-2 rounded-full bg-primary/10">
            <Award className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm sm:text-base text-foreground">{t.achievements_title}</h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {unlockedCount} {t.achievements_unlocked}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5">
        {achievements.map((achievement, index) => {
          const Icon = achievement.icon;
          return (
            <div
              key={achievement.id}
              className={`p-2 sm:p-2.5 rounded-lg border transition-all ${
                achievement.unlocked
                  ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 shadow-sm'
                  : 'bg-muted/30 border-border/50 opacity-60'
              } animate-scale-in`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`inline-flex p-1.5 sm:p-2 rounded-lg mb-1.5 sm:mb-2 ${
                achievement.unlocked ? 'bg-primary/20' : 'bg-muted'
              }`}>
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                  achievement.unlocked ? 'text-primary' : 'text-muted-foreground'
                }`} />
              </div>
              
              <h4 className={`text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1 ${
                achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {achievement.title}
              </h4>
              
              <p className="text-[9px] sm:text-[10px] text-muted-foreground line-clamp-2">
                {achievement.description}
              </p>

              {!achievement.unlocked && achievement.progress !== undefined && achievement.target && (
                <div className="mt-1.5 sm:mt-2">
                  <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-muted-foreground mb-1">
                    <span>{achievement.progress}/{achievement.target}</span>
                    <span>{Math.round((achievement.progress / achievement.target) * 100)}%</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary/50 transition-all duration-300"
                      style={{ width: `${Math.min((achievement.progress / achievement.target) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default AchievementBadges;
