import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface DailyPromptData {
  id: string;
  prompt_text_en: string | null;
  prompt_text_es: string | null;
  prompt_text_de: string | null;
  category: string;
  active_date: string;
}

const DailyPrompt = () => {
  const [prompt, setPrompt] = useState<DailyPromptData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  useEffect(() => {
    loadTodayPrompt();
  }, []);

  const loadTodayPrompt = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('daily_prompts')
      .select('*')
      .eq('active_date', today)
      .single();
    
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

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20 px-[15px] py-[4px] mx-0 my-[26px]">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-2">{t.daily_prompt_title}</h3>
          <p className="text-muted-foreground mb-4">{getPromptText()}</p>
          
          <Button onClick={() => navigate('/')} variant="default" size="sm">
            {t.daily_prompt_share}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default DailyPrompt;
