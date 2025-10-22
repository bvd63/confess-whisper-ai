import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface SubscriptionActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export const useSubscriptionActions = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const upgradeSubscription = async (targetPriceId: string): Promise<SubscriptionActionResult> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('subscription-upgrade', {
        body: { targetPriceId }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        if (data.error === 'already_on_plan') {
          toast({
            title: t.already_on_this_plan,
            variant: "default",
          });
          return { success: false, error: 'already_on_plan' };
        }
        throw new Error(data.error);
      }

      toast({
        title: t.upgrade_processing_now,
        description: "Your subscription is being upgraded...",
        variant: "default",
      });

      return { success: true, message: data?.message };
    } catch (error) {
      console.error('Upgrade error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Upgrade Failed",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const downgradeSubscription = async (targetPriceId: string): Promise<SubscriptionActionResult> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('subscription-downgrade', {
        body: { targetPriceId }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        if (data.error === 'already_on_plan') {
          toast({
            title: t.already_on_this_plan,
            variant: "default",
          });
          return { success: false, error: 'already_on_plan' };
        }
        if (data.error === 'invalid_target') {
          toast({
            title: t.invalid_target_plan,
            variant: "destructive",
          });
          return { success: false, error: 'invalid_target' };
        }
        throw new Error(data.error);
      }

      toast({
        title: t.downgrade_scheduled_next_period,
        description: "Your downgrade will take effect at the next billing period.",
        variant: "default",
      });

      return { success: true, message: data?.message };
    } catch (error) {
      console.error('Downgrade error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Downgrade Failed",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    upgradeSubscription,
    downgradeSubscription,
    isLoading
  };
};
