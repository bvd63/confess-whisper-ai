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

export const TrialCTA = ({ userId, onTrialStarted }: TrialCTAProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartTrial = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-trial-checkout', {
        body: { tier: 'premium' }
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

      if (data?.url) {
        window.open(data.url, '_blank');
        onTrialStarted?.();
      }
    } catch (error) {
      console.error('Error starting trial:', error);
      toast({
        title: t.error_generic,
        description: t.error_generic,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="w-5 h-5 text-violet-500" />
          {t.trial_try_premium}
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          {t.trial_add_card_required}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleStartTrial} 
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {isLoading ? t.loading : t.trial_try_premium}
        </Button>
      </CardContent>
    </Card>
  );
};
