import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Zap, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface BoostConfessionButtonProps {
  confessionId: string;
  onBoostSuccess?: () => void;
}

export const BoostConfessionButton = ({ confessionId, onBoostSuccess }: BoostConfessionButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleBoost = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('boost-confession', {
        body: { confessionId }
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

      toast({
        title: t.boost_success_title,
        description: t.boost_success_description,
      });

      onBoostSuccess?.();
    } catch (error) {
      console.error('Error boosting confession:', error);
      toast({
        title: t.error_generic,
        description: t.boost_error,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowConfirmDialog(true)}
        disabled={isLoading}
        className="gap-2"
      >
        <Zap className="w-4 h-4" />
        {t.boost_cta}
      </Button>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              {t.boost_cta}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>{t.boost_confirm}</p>
              <div className="font-semibold text-primary">
                {t.boost_price.replace("{price}", "15")}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common_close}</AlertDialogCancel>
            <AlertDialogAction onClick={handleBoost} disabled={isLoading}>
              {isLoading ? t.submitting : t.boost_cta}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};