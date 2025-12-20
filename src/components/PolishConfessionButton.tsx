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
      variant="outline"
      size="sm"
      onClick={handlePolish}
      disabled={isDisabled}
      className={cn(
        "group flex items-center gap-3 px-4 py-3 rounded-2xl border border-primary/20",
        "bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 backdrop-blur-sm",
        "hover:from-primary/15 hover:via-accent/15 hover:to-primary/15 hover:border-primary/30",
        "transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-primary/10",
        "self-start sm:self-auto",
        isDisabled && "opacity-60"
      )}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 group-hover:from-primary/30 group-hover:to-accent/30 transition-all">
        {isPolishing ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4 text-primary" />
        )}
      </div>
      <div className="flex flex-col items-start text-left">
        <span className="text-sm font-semibold text-foreground">
          {actionLabel}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Coins className="w-3 h-3 text-amber-500" />
          <span>{costLabel}</span>
        </span>
      </div>
    </Button>
  );
};