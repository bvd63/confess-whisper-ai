import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trophy } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface AchievementToastProps {
  userId: string;
}

const AchievementToast = ({ userId }: AchievementToastProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    // Subscribe to new badges being awarded
    const channel = supabase
      .channel('badge-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_badges',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          // Get badge details
          const { data: badge } = await supabase
            .from('badges')
            .select('name, description')
            .eq('id', payload.new.badge_id)
            .single();

          if (badge) {
            toast({
              title: t.achievement_new_badge,
              description: `${badge.name}: ${badge.description}`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast, t.achievement_new_badge]);

  return null; // This component doesn't render anything
};

export default AchievementToast;