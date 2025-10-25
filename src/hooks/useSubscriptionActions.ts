import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { STRIPE_PRICE } from "@/lib/stripe-config";

interface SubscriptionActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

const mapPriceIdToTier = (priceId: string): "vip" | "free" => {
  if (!priceId) return "free";
  if (priceId === STRIPE_PRICE.VIP_MONTHLY || priceId === STRIPE_PRICE.VIP_YEARLY) {
    return "vip";
  }
  return "free";
};

export const useSubscriptionActions = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const upgradeSubscription = async (targetPriceId: string): Promise<SubscriptionActionResult> => {
    setIsLoading(true);
    try {
      const targetTier = mapPriceIdToTier(targetPriceId);
      if (targetTier === "free") throw new Error("Invalid target price id");

      const { data, error } = await supabase.functions.invoke('manage-subscription-v2', {
        body: { action: 'upgrade', targetTier }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: t.upgrade_processing_now,
        description: "Your subscription is being upgraded...",
      });
      return { success: true, message: data?.message };
    } catch (error) {
      console.error('Upgrade error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: "Upgrade Failed", description: errorMessage, variant: "destructive" });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const downgradeSubscription = async (targetPriceId: string): Promise<SubscriptionActionResult> => {
    setIsLoading(true);
    try {
      const targetTier = mapPriceIdToTier(targetPriceId);
      if (targetTier === "free") throw new Error("Invalid target price id");

      const { data, error } = await supabase.functions.invoke('manage-subscription-v2', {
        body: { action: 'downgrade', targetTier }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: t.downgrade_scheduled_next_period,
        description: "Your plan change has been applied.",
      });
      return { success: true, message: data?.message };
    } catch (error) {
      console.error('Downgrade error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: "Downgrade Failed", description: errorMessage, variant: "destructive" });
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
