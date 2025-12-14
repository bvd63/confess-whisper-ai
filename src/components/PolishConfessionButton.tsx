import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Coins, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { logError } from "@/lib/logger";

interface PolishConfessionButtonProps {
  confessionText: string;
  onPolishedTextReceived: (polishedText: string) => void;
  disabled?: boolean;
}

export const PolishConfessionButton = ({ 
  confessionText, 
  onPolishedTextReceived,
  disabled 
}: PolishConfessionButtonProps) => {
  const [isPolishing, setIsPolishing] = useState(false);
  const { toast } = useToast();
  const { language, t } = useLanguage();

  const handlePolish = async () => {
    if (!confessionText || confessionText.trim().length === 0) {
      toast({
        title: t.error_generic,
        description: t.polish_empty_error,
        variant: "destructive",
      });
      return;
    }

    setIsPolishing(true);
    try {
      const { data, error } = await supabase.functions.invoke('polish-confession', {
        body: { 
          confessionText: confessionText.trim(),
          language 
        }
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: t.error_generic,
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      if (data.polishedText) {
        onPolishedTextReceived(data.polishedText);
        toast({
          title: t.polish_success_title,
          description: t.polish_success_description,
        });
      }
    } catch (error) {
      logError('Error polishing confession', error as Error);
      toast({
        title: t.error_generic,
        description: t.polish_error,
        variant: "destructive",
      });
    } finally {
      setIsPolishing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePolish}
      disabled={disabled || isPolishing || !confessionText?.trim()}
      className="group flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 border border-primary/20 backdrop-blur-sm hover:from-primary/15 hover:via-purple-500/15 hover:to-primary/15 hover:border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-primary/10"
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 group-hover:from-primary/30 group-hover:to-purple-500/30 transition-all">
        {isPolishing ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4 text-primary" />
        )}
      </div>
      <div className="flex flex-col items-start">
        <span className="text-sm font-medium text-foreground">
          {isPolishing ? t.polishing : t.polish_enhance_ai || "Enhance with AI"}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Coins className="w-3 h-3 text-amber-500" />
          <span>{t.polish_costs_coins || "Costs 10 coins"}</span>
        </span>
      </div>
    </button>
  );
};