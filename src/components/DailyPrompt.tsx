import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DailyPromptData {
  id: string;
  prompt_text: string;
  category: string;
  active_date: string;
}

const DailyPrompt = () => {
  const [prompt, setPrompt] = useState<DailyPromptData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-2">Întrebarea zilei</h3>
          <p className="text-muted-foreground mb-4">{prompt.prompt_text}</p>
          
          <Button 
            onClick={() => navigate('/')}
            variant="default"
            size="sm"
          >
            Împărtășește-ți gândurile
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default DailyPrompt;