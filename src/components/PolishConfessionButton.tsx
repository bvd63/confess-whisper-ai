import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Coins, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

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
      console.error('Error polishing confession:', error);
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
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handlePolish}
      disabled={disabled || isPolishing || !confessionText?.trim()}
      className="gap-2"
    >
      {isPolishing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4 text-purple-500" />
      )}
      <span className="hidden sm:inline">
        {isPolishing ? t.polishing : t.polish_confession}
      </span>
      <span className="flex items-center gap-1 text-yellow-600 text-xs">
        <Coins className="w-3 h-3" />
        10
      </span>
    </Button>
  );
};