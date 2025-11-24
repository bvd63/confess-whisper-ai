import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/translated-dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { logError } from "@/lib/logger";

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
      const { data, error } = await supabase.functions.invoke('deep-insight', {
        body: { confessionId: confession.id, action: 'run' }
      });

      if (error) throw error;

      if (data?.insight?.text) {
        setInsight(data.insight.text);
        toast({
          title: t.deep_insight_success,
          description: t.deep_insight_description,
        });
        onInsightGenerated();
      }

    } catch (error) {
      logError('Error generating deep insight', error instanceof Error ? error : undefined);
      toast({
        title: t.error_generic,
        description: t.error_generic,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const resetInsight = () => {
    setInsight("");
  };

  const deleteInsight = async () => {
    try {
      const { error } = await supabase.functions.invoke('deep-insight', {
        body: { confessionId: confession.id, action: 'delete' }
      });

      if (error) throw error;

      setInsight("");
      toast({
        title: t.insight_delete,
        description: t.deep_insight_success,
      });
      onInsightGenerated();
    } catch (error) {
      logError('Error deleting insight', error instanceof Error ? error : undefined);
      toast({
        title: t.error_generic,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary animate-pulse" />
            ✨ {t.deep_insight_title}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            🧠 {t.deep_insight_description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
          {/* Original Confession */}
          <div className="p-3 sm:p-4 bg-muted/50 rounded-xl border border-border">
            <p className="text-xs sm:text-sm text-muted-foreground mb-2">💬 {t.deep_insight_your_confession}</p>
            <p className="text-sm sm:text-base text-foreground leading-relaxed">
              {confession.content}
            </p>
          </div>

          {/* Deep Insight */}
          {insight ? (
            <div className="space-y-3">
              <div className="p-3 sm:p-5 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20 animate-slide-up">
                <div className="flex items-center gap-2 mb-2 sm:mb-3 text-primary">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                  <span className="text-sm sm:text-base font-semibold">✨ {t.deep_insight_title}</span>
                </div>
                <p className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-line">
                  {insight}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={resetInsight}
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-lg border-border hover:bg-accent"
                >
                  🔄 {t.insight_reset}
                </Button>
                <Button
                  onClick={deleteInsight}
                  variant="destructive"
                  size="sm"
                  className="flex-1 rounded-lg"
                >
                  🗑️ {t.insight_delete}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8">
              {!isPremium ? (
                <div className="space-y-3 sm:space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-primary/10 rounded-full border border-primary/20">
                    <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                    <span className="text-xs sm:text-sm text-primary font-semibold">👑 {t.vip_feature}</span>
                  </div>
                  <p className="text-muted-foreground text-xs sm:text-sm px-4">
                    🔒 {t.deep_insight_vip}
                  </p>
                  <Button
                    onClick={onUpgradeClick}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-xs sm:text-sm rounded-lg h-10 font-semibold"
                    size="sm"
                  >
                    <Crown className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    ⬆️ {t.vip_upgrade}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={generateDeepInsight}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-xs sm:text-sm rounded-lg h-10 font-semibold"
                  size="sm"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                      ⏳ {t.submitting}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-pulse" />
                      ✨ {t.generate_insight}
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
