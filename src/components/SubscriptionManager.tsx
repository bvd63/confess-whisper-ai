import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/contexts/ConfirmContext";
import { notify } from "@/lib/notifications";

interface SubscriptionManagerProps {
  userId: string;
  currentTier: "free" | "vip";
  onActionComplete?: () => void;
}

export const SubscriptionManager = ({ userId, currentTier, onActionComplete }: SubscriptionManagerProps) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: 'cancel' | 'upgrade' | 'downgrade', newTier?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: { action, newTier }
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: t.error_generic,
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t.success,
        description: data.message || t.success,
      });

      onActionComplete?.();
    } catch (error) {
      console.error('Error managing subscription:', error);
      toast({
        title: t.error_generic,
        description: t.error_generic,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (currentTier === 'free') {
    return null; // Don't show manager for free users
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.subs_manage}</CardTitle>
        <CardDescription>{t.subscription_description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Downgrade option - VIP to Free */}
        {currentTier === 'vip' && (
          <Button 
            onClick={() => handleAction('upgrade', 'vip')}
            disabled={isLoading}
            className="w-full"
            variant="default"
          >
            <ArrowUp className="w-4 h-4 mr-2" />
            {t.subs_upgrade} {t.subscription_plan_vip}
          </Button>
        )}

        {/* Downgrade option - VIP to Free */}
        {currentTier === 'vip' && (
          <Button 
            onClick={() => handleAction('downgrade', 'free')}
            disabled={isLoading}
            className="w-full"
            variant="outline"
          >
            <ArrowDown className="w-4 h-4 mr-2" />
            {t.subs_downgrade} {t.subscription_plan_free}
          </Button>
        )}

        {/* Cancel subscription */}
        <Button 
          disabled={isLoading}
          className="w-full"
          variant="destructive"
          onClick={async () => {
            const confirmed = await confirm({
              titleKey: 'confirm.cancelSubscription.title',
              messageKey: 'confirm.cancelSubscription.message',
              variant: 'warning',
            });
            
            if (confirmed) {
              await handleAction('cancel');
            }
          }}
        >
          <XCircle className="w-4 h-4 mr-2" />
          {t.subs_cancel}
        </Button>
      </CardContent>
    </Card>
  );
};
