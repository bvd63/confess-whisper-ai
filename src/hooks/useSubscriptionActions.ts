import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { STRIPE_PRICE_IDS } from "@/lib/stripe-config";

interface SubscriptionActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

const mapPriceIdToTier = (priceId: string): "premium" | "vip" | "free" => {
  if (!priceId) return "free";
  const entries = Object.entries(STRIPE_PRICE_IDS);
  for (const [key, val] of entries) {
    if (val === priceId) {
      if (key.startsWith("vip_")) return "vip";
      if (key.startsWith("premium_")) return "premium";
    }
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

  const cancelSubscription = async (): Promise<SubscriptionActionResult> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('billing-cancel');
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: t.cancel_scheduled || "Subscription Canceled",
        description: "Your subscription will be canceled at the end of the billing period.",
      });
      return { success: true, message: data?.message };
    } catch (error) {
      console.error('Cancel error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({ 
        title: "Cancellation Failed", 
        description: errorMessage, 
        variant: "destructive" 
      });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const reactivateSubscription = async (): Promise<SubscriptionActionResult> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('billing-reactivate');
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: t.subscription_reactivate_success || "Subscription Reactivated",
        description: "Your subscription has been successfully reactivated.",
      });
      return { success: true, message: data?.message };
    } catch (error) {
      console.error('Reactivate error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({ 
        title: "Reactivation Failed", 
        description: errorMessage, 
        variant: "destructive" 
      });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const previewSubscriptionChange = async (targetPriceId: string): Promise<{
    success: boolean;
    preview?: {
      amountDue: number;
      currency: string;
      prorationAmount: number;
      subtotal: number;
      total: number;
      periodEnd: number;
      lines: Array<{ description: string; amount: number; proration: boolean }>;
    };
    error?: string;
  }> => {
    try {
      const { data, error } = await supabase.functions.invoke('billing-preview', {
        body: { targetPriceId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return { success: true, preview: data.preview };
    } catch (error) {
      console.error('Preview error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  };

  return {
    upgradeSubscription,
    downgradeSubscription,
    cancelSubscription,
    reactivateSubscription,
    previewSubscriptionChange,
    isLoading
  };
};
