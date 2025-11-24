import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCard } from "@/components/AnimatedCard";
import { EnhancedButton } from "@/components/EnhancedButton";
import { FloatingElement } from "@/components/FloatingElement";
import { Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
interface DailyPromptData {
  id: string;
  prompt_text_en: string | null;
  prompt_text_es: string | null;
  prompt_text_de: string | null;
  category: string;
  active_date: string;
}
interface DailyPromptProps {
  onOpenNewConfession?: () => void;
}
const DailyPrompt = ({
  onOpenNewConfession
}: DailyPromptProps) => {
  const [prompt, setPrompt] = useState<DailyPromptData | null>(null);
  const [loading, setLoading] = useState(true);
  const {
    t,
    language
  } = useLanguage();
  useEffect(() => {
    loadTodayPrompt();
  }, []);
  const loadTodayPrompt = async () => {
    const today = new Date().toISOString().split('T')[0];
    const {
      data,
      error
    } = await supabase.from('daily_prompts').select('*').eq('active_date', today).single();
    if (!error && data) {
      setPrompt(data);
    }
    setLoading(false);
  };
  if (loading || !prompt) return null;

  // Get the prompt text in the current language with fallback to English
  const getPromptText = () => {
    if (language === 'es' && prompt.prompt_text_es) {
      return prompt.prompt_text_es;
    }
    if (language === 'de' && prompt.prompt_text_de) {
      return prompt.prompt_text_de;
    }
    return prompt.prompt_text_en || '';
  };
  return <AnimatedCard hover="glow" gradient className="p-3 sm:p-4 border-primary/20 mb-3 sm:mb-4 bg-card">
      <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
        </div>
        
        <div className="flex-1 w-full sm:w-auto">
          <h3 className="font-semibold text-sm sm:text-base mb-1.5 sm:mb-2 text-foreground">
            ✨ {t.daily_prompt_title}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">{getPromptText()}</p>
          
          <EnhancedButton 
            onClick={onOpenNewConfession} 
            variant="default" 
            size="sm" 
            className="w-full sm:w-auto text-xs h-9 rounded-lg font-semibold" 
            lift
          >
            💬 {t.daily_prompt_share}
          </EnhancedButton>
        </div>
      </div>
    </AnimatedCard>;
};
export default DailyPrompt;