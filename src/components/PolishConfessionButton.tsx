import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Coins, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { logError } from "@/lib/logger";
import { cn } from "@/lib/utils";

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

  const isDisabled = disabled || isPolishing || !confessionText?.trim();
  const actionLabel = isPolishing ? t.polishing : (t.polish_enhance_ai || t.polish_confession);
  const costLabel = t.polish_costs_coins || "Costs 10 coins";

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handlePolish}
      disabled={isDisabled}
      className={cn(
        "w-full flex items-center justify-between px-4 py-3 h-auto rounded-xl",
        "bg-white/5 backdrop-blur-sm border border-white/10",
        "hover:bg-white/10 transition-all duration-200",
        isDisabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-3">
        {isPolishing ? (
          <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4 text-purple-400" />
        )}
        <span className="text-sm font-medium text-foreground">
          {t.polish_enhance_ai || "Enhance with AI"}
        </span>
        <span className="text-sm text-muted-foreground">·</span>
        <span className="text-sm text-muted-foreground">
          10 {t.coins_title?.toLowerCase() || "coins"}
        </span>
      </div>
      <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Button>
  );
};