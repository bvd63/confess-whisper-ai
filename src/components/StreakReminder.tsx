import { useEffect, useState } from 'react';
import { AlertCircle, Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface StreakReminderProps {
  userId: string;
}

const StreakReminder = ({ userId }: StreakReminderProps) => {
  const { t } = useLanguage();
  const [showReminder, setShowReminder] = useState(false);
  const [hoursLeft, setHoursLeft] = useState(0);

  useEffect(() => {
    const checkStreakStatus = async () => {
      try {
        const { data: streak } = await supabase
          .from('user_streaks')
          .select('last_confession_date, current_streak')
          .eq('user_id', userId)
          .maybeSingle();

        if (!streak?.last_confession_date || streak.current_streak === 0) {
          setShowReminder(false);
          return;
        }

        const lastDate = new Date(streak.last_confession_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        lastDate.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        // Show reminder if last confession was yesterday and haven't confessed today
        if (daysDiff === 1) {
          const endOfDay = new Date();
          endOfDay.setHours(23, 59, 59, 999);
          const hours = Math.ceil((endOfDay.getTime() - Date.now()) / (1000 * 60 * 60));
          
          if (hours <= 6) {
            setHoursLeft(hours);
            setShowReminder(true);
          }
        } else if (daysDiff === 0) {
          // Already confessed today
          setShowReminder(false);
        } else if (daysDiff > 1) {
          // Streak already broken
          setShowReminder(false);
        }
      } catch (error) {
        console.error('Error checking streak status:', error);
      }
    };

    checkStreakStatus();
    const interval = setInterval(checkStreakStatus, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [userId]);

  if (!showReminder) return null;

  return (
    <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
          <AlertCircle className="w-3 h-3 text-red-500 absolute -top-1 -right-1" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-orange-400 mb-1">
            {t.streak_at_risk || "Don't lose your streak!"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t.streak_reminder_message?.replace('{hours}', hoursLeft.toString()) || 
              `You have ${hoursLeft} hours left to keep your streak alive. Share a confession now!`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StreakReminder;
