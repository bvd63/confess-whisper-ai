import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/translated-dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface DeepInsightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confession: {
    id: string;
    content: string;
    ai_deep_insight?: string | null;
  };
  isPremium: boolean;
  onUpgradeClick: () => void;
  onInsightGenerated: () => void;
}

const DeepInsightDialog = ({ 
  open, 
  onOpenChange, 
  confession, 
  isPremium,
  onUpgradeClick,
  onInsightGenerated 
}: DeepInsightDialogProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [insight, setInsight] = useState(confession.ai_deep_insight || "");
  const { toast } = useToast();
  const { language, t } = useLanguage();

  const generateDeepInsight = async () => {
    if (!isPremium) {
      onUpgradeClick();
      return;
    }

    setIsGenerating(true);
    try {
      const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-confession-response', {
        body: { confession: confession.content, type: 'deep', language }
      });

      if (aiError) throw aiError;

      const deepInsight = aiData?.response;
      setInsight(deepInsight);

      // Update confession with deep insight
      const { error: updateError } = await supabase
        .from('confessions')
        .update({ ai_deep_insight: deepInsight })
        .eq('id', confession.id);

      if (updateError) throw updateError;

      toast({
        title: t.deep_insight_success,
        description: t.deep_insight_description,
      });

      onInsightGenerated();

    } catch (error) {
      console.error('Error generating deep insight:', error);
      toast({
        title: t.error_generic,
        description: t.error_generic,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-card to-primary/5 border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            {t.deep_insight_title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t.deep_insight_description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Original Confession */}
          <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
            <p className="text-sm text-muted-foreground mb-2">{t.deep_insight_your_confession}</p>
            <p className="text-foreground leading-relaxed">
              {confession.content}
            </p>
          </div>

          {/* Deep Insight */}
          {insight ? (
            <div className="p-5 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 animate-slide-up">
              <div className="flex items-center gap-2 mb-3 text-primary">
                <Sparkles className="w-5 h-5" />
                <span className="font-medium">{t.deep_insight_title}</span>
              </div>
              <p className="text-foreground/90 leading-relaxed whitespace-pre-line">
                {insight}
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              {!isPremium ? (
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
                    <Crown className="w-4 h-4 text-primary" />
                    <span className="text-sm text-primary font-medium">{t.premium_feature}</span>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {t.deep_insight_premium}
                  </p>
                  <Button
                    onClick={onUpgradeClick}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    {t.premium_upgrade}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={generateDeepInsight}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-[var(--shadow-glow)]"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t.submitting}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {t.generate_insight}
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeepInsightDialog;
