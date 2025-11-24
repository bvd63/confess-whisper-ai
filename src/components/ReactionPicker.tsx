import { Button } from "@/components/ui/button";
import { useState, useEffect, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { logError } from "@/lib/logger";

interface ReactionPickerProps {
  confessionId: string;
  userId: string | undefined;
}

const ReactionPicker = ({ confessionId, userId }: ReactionPickerProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set());
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const reactions = [
    { type: 'heart', emoji: '❤️', label: t.reaction_heart, color: 'text-red-500 dark:text-red-400' },
    { type: 'sad', emoji: '🥺', label: t.reaction_sad, color: 'text-blue-500 dark:text-blue-400' },
    { type: 'strong', emoji: '💪', label: t.reaction_strong, color: 'text-yellow-500 dark:text-yellow-400' },
    { type: 'thinking', emoji: '🤔', label: t.reaction_thinking, color: 'text-purple-500 dark:text-purple-400' },
  ];

  useEffect(() => {
    loadReactions();

    // Setup realtime subscription
    const channel = supabase
      .channel(`reactions-${confessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'confession_reactions',
          filter: `confession_id=eq.${confessionId}`
        },
        () => {
          loadReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [confessionId, userId]);

  const loadReactions = async () => {
    // Load all reactions for this confession
    const { data: allReactions } = await supabase
      .from('confession_reactions')
      .select('reaction_type, user_id')
      .eq('confession_id', confessionId);

    if (allReactions && Array.isArray(allReactions)) {
      const counts: Record<string, number> = {};
      const userSet = new Set<string>();

      allReactions.forEach(r => {
        counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
        if (userId && r.user_id === userId) {
          userSet.add(r.reaction_type);
        }
      });

      setReactionCounts(counts);
      setUserReactions(userSet);
    }
  };

  const toggleReaction = async (reactionType: string) => {
    if (!userId) {
      toast({
        title: t.reaction_auth_required,
        description: t.reaction_auth_required_desc,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // If clicking on already selected reaction, remove it
      if (userReactions.has(reactionType)) {
        const { error } = await supabase
          .from('confession_reactions')
          .delete()
          .eq('confession_id', confessionId)
          .eq('user_id', userId)
          .eq('reaction_type', reactionType);

        if (error) throw error;
      } else {
        // Remove all existing reactions for this user on this confession
        const { error: deleteError } = await supabase
          .from('confession_reactions')
          .delete()
          .eq('confession_id', confessionId)
          .eq('user_id', userId);

        if (deleteError) throw deleteError;

        // Add the new reaction
        const { error: insertError } = await supabase
          .from('confession_reactions')
          .insert({
            confession_id: confessionId,
            user_id: userId,
            reaction_type: reactionType,
          });

        if (insertError) throw insertError;
      }
    } catch (error) {
      logError('Error toggling reaction', error as Error);
      toast({
        title: t.common_error,
        description: t.reaction_update_error,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-1 sm:gap-1.5">
      {reactions.map(({ type, emoji, label, color }) => {
        const count = reactionCounts[type] || 0;
        const isActive = userReactions.has(type);
        const displayCount = count > 99 ? '99+' : count;

        return (
          <Button
            key={type}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => toggleReaction(type)}
            disabled={isLoading}
            className={cn(
              "flex-col gap-0.5 h-auto min-w-[44px] sm:min-w-[48px] px-2 py-1.5 touch-manipulation transition-transform hover:scale-110 active:scale-95",
              isActive && color
            )}
            title={label}
          >
            <span className="text-xl sm:text-2xl">{emoji}</span>
            {count > 0 && (
              <span className="text-[9px] sm:text-[10px] font-semibold leading-none">
                {displayCount}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
};

export default memo(ReactionPicker);