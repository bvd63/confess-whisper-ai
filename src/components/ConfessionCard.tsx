import { useState } from "react";
import { Card } from "@/components/ui/card";
import { MessageCircle, AlertCircle, Sparkles } from "lucide-react";
import DeepInsightDialog from "./DeepInsightDialog";
import { Button } from "@/components/ui/button";

interface ConfessionCardProps {
  confession: {
    id: string;
    content: string;
    ai_response?: string | null;
    ai_deep_insight?: string | null;
    created_at: string;
  };
  isPremium: boolean;
  onReport?: (id: string) => void;
  onUpgradeClick: () => void;
  onInsightGenerated: () => void;
}

const ConfessionCard = ({ confession, isPremium, onReport, onUpgradeClick, onInsightGenerated }: ConfessionCardProps) => {
  const [isDeepInsightOpen, setIsDeepInsightOpen] = useState(false);
  const timeAgo = (date: string) => {
    const now = new Date();
    const confessionDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - confessionDate.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'acum';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}z`;
  };

  return (
    <Card className="p-5 mb-4 bg-gradient-to-br from-card to-muted/30 border-border/50 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-glow)] transition-all duration-300 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <MessageCircle className="w-4 h-4" />
          <span>Anonim • {timeAgo(confession.created_at)}</span>
        </div>
        {onReport && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReport(confession.id)}
            className="h-8 px-2 text-muted-foreground hover:text-destructive"
          >
            <AlertCircle className="w-4 h-4" />
          </Button>
        )}
      </div>

      <p className="text-foreground leading-relaxed mb-4">
        {confession.content}
      </p>

      {confession.ai_response && (
        <>
          <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
            <div className="flex items-center gap-2 mb-2 text-primary text-sm font-medium">
              <MessageCircle className="w-4 h-4" />
              <span>Răspuns AI empatic</span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed italic">
              {confession.ai_response}
            </p>
          </div>

          {/* Deep Insight Button */}
          <Button
            onClick={() => setIsDeepInsightOpen(true)}
            variant="outline"
            className="w-full mt-3 border-primary/30 hover:bg-primary/10 hover:border-primary/50 text-primary"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {confession.ai_deep_insight ? "Vezi Deep Insight" : "Generează Deep Insight"}
          </Button>
        </>
      )}

      <DeepInsightDialog
        open={isDeepInsightOpen}
        onOpenChange={setIsDeepInsightOpen}
        confession={confession}
        isPremium={isPremium}
        onUpgradeClick={onUpgradeClick}
        onInsightGenerated={onInsightGenerated}
      />
    </Card>
  );
};

export default ConfessionCard;
