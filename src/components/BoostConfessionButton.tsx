import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TrendingUp, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
        <TrendingUp className="w-4 h-4" />
        <span className="hidden sm:inline">{t.boost_confession}</span>
        <span className="flex items-center gap-1 text-yellow-600">
          <Coins className="w-3 h-3" />
          15
        </span>
      </Button>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              {t.boost_confession}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>{t.boost_confirmation_description}</p>
              <div className="flex items-center gap-2 text-yellow-600 font-semibold">
                <Coins className="w-4 h-4" />
                <span>{t.boost_cost}</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleBoost} disabled={isLoading}>
              {isLoading ? t.processing : t.boost_now}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};