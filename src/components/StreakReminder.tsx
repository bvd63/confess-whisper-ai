import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface StreakReminderProps {
  userId: string;
}

const StreakReminder = ({ userId }: StreakReminderProps) => {
  const [showReminder, setShowReminder] = useState(false);
  const [streak, setStreak] = useState(0);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    checkStreakStatus();
  }, [userId]);

  const checkStreakStatus = async () => {
    const { data } = await supabase
      .from('user_streaks')
      .select('current_streak, last_confession_date')
      .eq('user_id', userId)
      .maybeSingle();

    if (!data) return;

    const today = new Date().toISOString().split('T')[0];
    const lastDate = data.last_confession_date;

    // Show reminder if user hasn't posted today
    if (lastDate !== today && data.current_streak > 0) {
      setStreak(data.current_streak);
      setShowReminder(true);
    }
  };

  if (!showReminder) return null;

  return (
    <Card className="p-4 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border-orange-500/20">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
          <Flame className="w-5 h-5 text-orange-500" />
        </div>

        <div className="flex-1">
          <h4 className="font-semibold mb-1">Keep your streak! 🔥</h4>
          <p className="text-sm text-muted-foreground mb-3">
            {t.streak_reminder_text.replace('{count}', streak.toString())}
          </p>

          <Button 
            size="sm"
            onClick={() => navigate('/')}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {t.streak_post_now}
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setShowReminder(false)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};

export default StreakReminder;