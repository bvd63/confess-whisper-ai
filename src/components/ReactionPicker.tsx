import { Heart, Frown, Zap, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

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
    { type: 'heart', icon: Heart, label: t.reaction_heart, color: 'text-red-500' },
    { type: 'sad', icon: Frown, label: t.reaction_sad, color: 'text-blue-500' },
    { type: 'strong', icon: Zap, label: t.reaction_strong, color: 'text-yellow-500' },
    { type: 'thinking', icon: Lightbulb, label: t.reaction_thinking, color: 'text-purple-500' },
  ];

  useEffect(() => {
    loadReactions();
  }, [confessionId, userId]);

  const loadReactions = async () => {
    // Load all reactions for this confession
    const { data: allReactions } = await supabase
      .from('confession_reactions')
      .select('reaction_type, user_id')
      .eq('confession_id', confessionId);

    if (allReactions) {
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
      if (userReactions.has(reactionType)) {
        // Remove reaction
        const { error } = await supabase
          .from('confession_reactions')
          .delete()
          .eq('confession_id', confessionId)
          .eq('user_id', userId)
          .eq('reaction_type', reactionType);

        if (error) throw error;

        setUserReactions(prev => {
          const newSet = new Set(prev);
          newSet.delete(reactionType);
          return newSet;
        });
      } else {
        // Add reaction
        const { error } = await supabase
          .from('confession_reactions')
          .insert({
            confession_id: confessionId,
            user_id: userId,
            reaction_type: reactionType,
          });

        if (error) throw error;

        setUserReactions(prev => new Set(prev).add(reactionType));
      }

      loadReactions();
    } catch (error) {
      console.error('Error toggling reaction:', error);
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
    <div className="flex flex-wrap gap-1.5 sm:gap-2">
      {reactions.map(({ type, icon: Icon, label, color }) => {
        const count = reactionCounts[type] || 0;
        const isActive = userReactions.has(type);

        return (
          <Button
            key={type}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => toggleReaction(type)}
            disabled={isLoading}
            className={cn(
              "gap-1 h-9 sm:h-8 min-w-[44px] px-2 sm:px-3 touch-manipulation",
              isActive && color
            )}
            title={label}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {count > 0 && <span className="text-xs">{count}</span>}
          </Button>
        );
      })}
    </div>
  );
};

export default ReactionPicker;