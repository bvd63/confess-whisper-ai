import { useState, useEffect, memo, useCallback } from "react";
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
    { type: 'heart', emoji: '❤️', label: t.reaction_heart },
    { type: 'sad', emoji: '🥺', label: t.reaction_sad },
    { type: 'strong', emoji: '💪', label: t.reaction_strong },
    { type: 'thinking', emoji: '🤔', label: t.reaction_thinking },
  ];

  const loadReactions = useCallback(async () => {
    try {
      const { data: allReactions, error } = await supabase
        .from('confession_reactions')
        .select('reaction_type, user_id')
        .eq('confession_id', confessionId);

      if (error) throw error;

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
    } catch (error) {
      logError('Error loading reactions', error as Error);
    }
  }, [confessionId, userId]);

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
  }, [confessionId, loadReactions]);

  const toggleReaction = async (reactionType: string) => {
    if (!userId) {
      toast({
        title: t.reaction_auth_required,
        description: t.reaction_auth_required_desc,
        variant: "destructive",
      });
      return;
    }

    const previousUserReactions = new Set(userReactions);
    const previousReactionCounts = { ...reactionCounts };

    const newUserReactions = new Set(userReactions);
    const newReactionCounts = { ...reactionCounts };

    if (userReactions.has(reactionType)) {
      newUserReactions.delete(reactionType);
      newReactionCounts[reactionType] = Math.max(0, (newReactionCounts[reactionType] || 0) - 1);
    } else {
      userReactions.forEach(oldType => {
        newUserReactions.delete(oldType);
        newReactionCounts[oldType] = Math.max(0, (newReactionCounts[oldType] || 0) - 1);
      });
      newUserReactions.add(reactionType);
      newReactionCounts[reactionType] = (newReactionCounts[reactionType] || 0) + 1;
    }

    setUserReactions(newUserReactions);
    setReactionCounts(newReactionCounts);
    setIsLoading(true);

    try {
      if (previousUserReactions.has(reactionType)) {
        const { error } = await supabase
          .from('confession_reactions')
          .delete()
          .eq('confession_id', confessionId)
          .eq('user_id', userId)
          .eq('reaction_type', reactionType);

        if (error) throw error;
      } else {
        const { error: deleteError } = await supabase
          .from('confession_reactions')
          .delete()
          .eq('confession_id', confessionId)
          .eq('user_id', userId);

        if (deleteError) throw deleteError;

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
      setUserReactions(previousUserReactions);
      setReactionCounts(previousReactionCounts);
      
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
    <div className="flex flex-wrap gap-1">
      {reactions.map(({ type, emoji, label }) => {
        const count = reactionCounts[type] || 0;
        const isActive = userReactions.has(type);
        const displayCount = count > 99 ? '99+' : count;

        return (
          <button
            key={type}
            onClick={() => toggleReaction(type)}
            disabled={isLoading}
            aria-pressed={isActive}
            className={cn(
              "group flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-200",
              "touch-manipulation focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/30",
              "active:scale-95",
              isActive
                ? "bg-primary/10 text-white"
                : "bg-transparent hover:bg-white/5 text-white/60 hover:text-white/80",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            title={label}
            aria-label={`${label}${count > 0 ? ` (${displayCount})` : ''}`}
          >
            <span className={cn(
              "text-sm leading-none transition-transform duration-200",
              isActive && "drop-shadow-[0_0_8px_rgba(139,92,246,0.4)]",
              "group-active:scale-110"
            )}>
              {emoji}
            </span>
            {count > 0 && (
              <span className="text-[10px] font-medium min-w-[12px] text-center">
                {displayCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default memo(ReactionPicker);
