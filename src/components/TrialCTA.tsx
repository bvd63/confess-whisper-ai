import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, CreditCard } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
interface TrialCTAProps {
  userId: string;
  onTrialStarted?: () => void;
}
export const TrialCTA = ({
  userId,
  onTrialStarted
}: TrialCTAProps) => {
  const {
    t
  } = useLanguage();
  const {
    toast
  } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const handleStartTrial = async () => {
    setIsLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('create-trial-checkout');
      if (error) throw error;
      if (data?.error) {
        const errorKey = data.error === 'TRIAL_ALREADY_USED' ? 'trial_error_used' : data.error === 'ALREADY_SUBSCRIBED' ? 'trial_error_already_subscribed' : 'error_generic';
        toast({
          title: t.error_generic,
          description: t[errorKey] || data.message || t.error_generic,
          variant: "destructive"
        });
        return;
      }
      if (data?.url) {
        window.open(data.url, '_blank');
        onTrialStarted?.();
      }
    } catch (error) {
      console.error('Error starting trial:', error);
      toast({
        title: t.error_generic,
        description: t.error_generic,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Start Your VIP Trial
        </CardTitle>
        <CardDescription>
          Try all VIP features free for 7 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleStartTrial} 
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          {isLoading ? t.loading : "Start Free Trial"}
        </Button>
      </CardContent>
    </Card>
  );
};