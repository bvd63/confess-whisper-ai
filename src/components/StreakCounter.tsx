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
const StreakCounter = ({
  userId,
  variant = "compact"
}: StreakCounterProps) => {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const {
    t,
    language
  } = useLanguage();
  useEffect(() => {
    loadStreak();
  }, [userId]);
  const loadStreak = async () => {
    const {
      data,
      error
    } = await supabase.from('user_streaks').select('current_streak, longest_streak, last_confession_date').eq('user_id', userId).single();
    if (!error && data) {
      setStreak(data);
    }
    setLoading(false);
  };
  if (loading || !streak) return null;
  if (variant === "compact") {
    if (streak.current_streak === 0) return null;
    return <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FF7A00]/10 dark:bg-[#FF7A00]/20 border border-[#FF7A00]/20 rounded-full">
        <Flame className={cn("w-4 h-4 flex-shrink-0", streak.current_streak >= 7 ? "text-[#FF7A00]" : "text-[#FFA500]")} />
        <span className="font-bold text-sm text-foreground">{streak.current_streak}</span>
        <span className="text-xs text-muted-foreground hidden xs:inline font-medium">{t.time_days}</span>
      </div>;
  }
  return;
};
export default StreakCounter;