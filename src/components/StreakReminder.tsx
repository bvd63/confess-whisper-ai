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
const StreakReminder = ({
  userId
}: StreakReminderProps) => {
  const [showReminder, setShowReminder] = useState(false);
  const [streak, setStreak] = useState(0);
  const navigate = useNavigate();
  const {
    t
  } = useLanguage();
  useEffect(() => {
    checkStreakStatus();
  }, [userId]);
  const checkStreakStatus = async () => {
    // Check if reminder was dismissed in this session
    const dismissed = sessionStorage.getItem(`streak-reminder-dismissed-${userId}`);
    if (dismissed === 'true') {
      setShowReminder(false);
      return;
    }
    const {
      data
    } = await supabase.from('user_streaks').select('current_streak, last_confession_date').eq('user_id', userId).maybeSingle();
    if (!data) return;
    const today = new Date().toISOString().split('T')[0];
    const lastDate = data.last_confession_date;

    // Show reminder if user hasn't posted today
    if (lastDate !== today && data.current_streak > 0) {
      setStreak(data.current_streak);
      setShowReminder(true);
    }
  };
  const handleDismiss = () => {
    // Store dismissal in sessionStorage (clears on logout/login)
    sessionStorage.setItem(`streak-reminder-dismissed-${userId}`, 'true');
    setShowReminder(false);
  };
  if (!showReminder) return null;
  return;
};
export default StreakReminder;