import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface StreakCounterProps {
  userId: string;
  variant?: "compact" | "full";
}

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_confession_date: string | null;
}

const StreakCounter = ({ userId, variant = "compact" }: StreakCounterProps) => {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const { t, language } = useLanguage();

  useEffect(() => {
    loadStreak();
  }, [userId]);

  const loadStreak = async () => {
    const { data, error } = await supabase
      .from('user_streaks')
      .select('current_streak, longest_streak, last_confession_date')
      .eq('user_id', userId)
      .single();

    if (!error && data) {
      setStreak(data);
    }
    setLoading(false);
  };

  if (loading || !streak) return null;

  if (variant === "compact") {
    if (streak.current_streak === 0) return null;
    
    return (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <Flame className={cn(
          "w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0",
          streak.current_streak >= 7 ? "text-orange-500" : "text-yellow-500"
        )} />
        <span className="font-semibold">{streak.current_streak}</span>
        <span className="text-muted-foreground hidden xs:inline">{t.time_days}</span>
      </div>
    );
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold">{t.streak_your}</h3>
        <Flame className={cn(
          "w-5 h-5 sm:w-6 sm:h-6",
          streak.current_streak >= 7 ? "text-orange-500 animate-pulse" : "text-yellow-500"
        )} />
      </div>
      
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="text-center p-3 sm:p-4 bg-accent/50 rounded-lg">
          <p className="text-2xl sm:text-3xl font-bold text-primary">{streak.current_streak}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">{t.streak_consecutive_days}</p>
        </div>
        
        <div className="text-center p-3 sm:p-4 bg-accent/50 rounded-lg">
          <p className="text-2xl sm:text-3xl font-bold text-primary">{streak.longest_streak}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">{t.streak_personal_best}</p>
        </div>
      </div>

      {streak.last_confession_date && (
        <p className="text-[10px] sm:text-xs text-muted-foreground text-center mt-3 sm:mt-4">
          {t.streak_last_confession} {new Date(streak.last_confession_date).toLocaleDateString(
            language === 'es' ? 'es-ES' : language === 'de' ? 'de-DE' : 'en-US'
          )}
        </p>
      )}
    </Card>
  );
};

export default StreakCounter;