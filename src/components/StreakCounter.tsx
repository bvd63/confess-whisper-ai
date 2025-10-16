import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
      <div className="flex items-center gap-1 text-sm">
        <Flame className={cn(
          "w-4 h-4",
          streak.current_streak >= 7 ? "text-orange-500" : "text-yellow-500"
        )} />
        <span className="font-semibold">{streak.current_streak}</span>
        <span className="text-muted-foreground">zile</span>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Streak-ul tău</h3>
        <Flame className={cn(
          "w-6 h-6",
          streak.current_streak >= 7 ? "text-orange-500 animate-pulse" : "text-yellow-500"
        )} />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-accent/50 rounded-lg">
          <p className="text-3xl font-bold text-primary">{streak.current_streak}</p>
          <p className="text-sm text-muted-foreground">Zile consecutive</p>
        </div>
        
        <div className="text-center p-4 bg-accent/50 rounded-lg">
          <p className="text-3xl font-bold text-primary">{streak.longest_streak}</p>
          <p className="text-sm text-muted-foreground">Record personal</p>
        </div>
      </div>

      {streak.last_confession_date && (
        <p className="text-xs text-muted-foreground text-center mt-4">
          Ultima confesiune: {new Date(streak.last_confession_date).toLocaleDateString('ro-RO')}
        </p>
      )}
    </Card>
  );
};

export default StreakCounter;