import { Button } from "@/components/ui/button";
import { useState, useEffect, memo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { logError } from "@/lib/logger";

interface ReactionPickerProps {
  confessionId: string;
  userId: string | undefined;
  variant?: "default" | "feed";
}

const ReactionPicker = ({ confessionId, userId, variant = "default" }: ReactionPickerProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set());
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const reactions = [
    { type: 'heart', emoji: '❤️', label: t.reaction_heart, color: 'text-red-500' },
    { type: 'sad', emoji: '🥺', label: t.reaction_sad, color: 'text-blue-500' },
    { type: 'strong', emoji: '💪', label: t.reaction_strong, color: 'text-yellow-500' },
    { type: 'thinking', emoji: '🤔', label: t.reaction_thinking, color: 'text-purple-500' },
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

    // Store previous state for rollback on error
    const previousUserReactions = new Set(userReactions);
    const previousReactionCounts = { ...reactionCounts };

    // Optimistic update: immediately update UI
    const newUserReactions = new Set(userReactions);
    const newReactionCounts = { ...reactionCounts };

    if (userReactions.has(reactionType)) {
      // Removing reaction
      newUserReactions.delete(reactionType);
      newReactionCounts[reactionType] = Math.max(0, (newReactionCounts[reactionType] || 0) - 1);
    } else {
      // Changing/adding reaction: remove old one, add new one
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
      // If clicking on already selected reaction, remove it
      if (previousUserReactions.has(reactionType)) {
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
      // Revert optimistic update on error
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
    <div
      className={cn(
        "flex flex-wrap gap-3",
        variant === "feed" && "grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3"
      )}
    >
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
              "group flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-all duration-200",
              "touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50",
              variant === "feed"
                ? cn(
                    "w-full bg-white/5 text-white/80 border-white/10 shadow-[0_18px_35px_rgba(4,5,15,0.35)]",
                    "backdrop-blur-md",
                    "hover:border-white/30 hover:text-white",
                    isActive && "bg-white text-slate-900 border-white text-sm font-semibold"
                  )
                : isActive
                  ? "border-primary/50 bg-primary/10 text-primary shadow-lg shadow-primary/20"
                  : "border-border/70 bg-background/80 text-foreground/80 hover:border-primary/40 hover:text-primary"
            )}
            title={label}
            aria-label={`${label}${count > 0 ? ` (${displayCount})` : ''}`}
          >
            <span className="text-2xl leading-none drop-shadow-sm">{emoji}</span>
            <span
              className={cn(
                "hidden sm:inline text-xs font-semibold tracking-tight transition-colors",
                variant === "feed"
                  ? cn(
                      "text-white/70",
                      isActive && "text-slate-900",
                      !isActive && "group-hover:text-white"
                    )
                  : isActive
                    ? "text-primary"
                    : "text-foreground/70 group-hover:text-primary"
              )}
            >
              {label}
            </span>
            <span
              className={cn(
                "text-[11px] font-bold rounded-full px-2 py-0.5",
                variant === "feed"
                  ? cn(
                      "bg-white/10 text-white",
                      isActive && "bg-slate-900/10 text-slate-900"
                    )
                  : isActive
                    ? "bg-primary/20 text-primary"
                    : "bg-background text-foreground/70"
              )}
            >
              {displayCount}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default memo(ReactionPicker);