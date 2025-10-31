import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface BadgesDisplayProps {
  userId: string;
  variant?: "compact" | "full";
}

interface UserFlair {
  id: string;
  flair_id: string;
  acquired_at: string;
  expires_at: string | null;
  is_equipped: boolean;
  profile_flairs: {
    icon: string;
    name_key: string;
  };
}

const BadgesDisplay = ({
  userId,
  variant = "compact"
}: BadgesDisplayProps) => {
  const [flairs, setFlairs] = useState<UserFlair[]>([]);
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFlairs();
    
    // Setup realtime subscription
    const channel = supabase
      .channel(`user-flairs-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_flairs',
          filter: `user_id=eq.${userId}`
        },
        () => {
          loadFlairs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadFlairs = async () => {
    try {
      const { data, error } = await supabase
        .from('user_flairs')
        .select(`
          id,
          flair_id,
          acquired_at,
          expires_at,
          is_equipped,
          profile_flairs!inner(
            icon,
            name_key
          )
        `)
        .eq('user_id', userId)
        .eq('is_equipped', true);

      if (error) throw error;

      // Filter out expired flairs
      const activeFlairs = (data || []).filter((f: any) => {
        if (!f.expires_at) return true;
        return new Date(f.expires_at) > new Date();
      });

      setFlairs(activeFlairs);
    } catch (error) {
      console.error('Error loading flairs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (flairs.length === 0) return null;

  if (variant === "compact") {
    return (
      <TooltipProvider>
        <div className="flex gap-0.5 sm:gap-1 flex-wrap">
          {flairs.slice(0, 3).map((flair) => {
            const flairName = t[flair.profile_flairs.name_key as keyof typeof t] as string || flair.profile_flairs.name_key;
            
            return (
              <Tooltip key={flair.id}>
                <TooltipTrigger>
                  <Badge 
                    variant="outline" 
                    className="h-5 sm:h-6 px-1 sm:px-1.5 py-0 gap-0.5 sm:gap-1 text-[10px] sm:text-xs border-primary/30 bg-primary/5"
                  >
                    <span className="text-xs">{flair.profile_flairs.icon}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-semibold text-xs sm:text-sm">{flairName}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
          {flairs.length > 3 && (
            <Badge variant="outline" className="text-[10px] sm:text-xs h-5 sm:h-6 px-1 sm:px-1.5 py-0 border-primary/30 bg-primary/5">
              +{flairs.length - 3}
            </Badge>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {flairs.map((flair) => {
        const flairName = t[flair.profile_flairs.name_key as keyof typeof t] as string || flair.profile_flairs.name_key;
        
        return (
          <div 
            key={flair.id} 
            className="flex flex-col items-center gap-2 p-3 sm:p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-primary/10">
              <span className="text-2xl">{flair.profile_flairs.icon}</span>
            </div>
            <div className="text-center">
              <p className="font-semibold text-xs sm:text-sm">{flairName}</p>
              {flair.expires_at && (
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  Expires: {new Date(flair.expires_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BadgesDisplay;