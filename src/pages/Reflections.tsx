import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Lock, Sparkles, Share2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSubscription } from "@/state/SubscriptionProvider";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";

const translations = {
  en: {
    title: "Daily Reflections",
    vip_only: "VIP Feature",
    upgrade_message: "Upgrade to VIP to unlock daily AI-powered reflections based on your emotional journey.",
    upgrade_button: "Upgrade to VIP",
    today: "Today's Reflection",
    no_reflection: "No reflection generated yet. Check back later!",
    share: "Share",
    past_reflections: "Past Reflections",
    loading: "Loading your reflections..."
  },
  es: {
    title: "Reflexiones Diarias",
    vip_only: "Función VIP",
    upgrade_message: "Actualiza a VIP para desbloquear reflexiones diarias impulsadas por IA basadas en tu viaje emocional.",
    upgrade_button: "Actualizar a VIP",
    today: "Reflexión de Hoy",
    no_reflection: "Aún no hay reflexión generada. ¡Vuelve más tarde!",
    share: "Compartir",
    past_reflections: "Reflexiones Pasadas",
    loading: "Cargando tus reflexiones..."
  },
  de: {
    title: "Tägliche Reflexionen",
    vip_only: "VIP-Funktion",
    upgrade_message: "Upgrade auf VIP, um tägliche KI-gestützte Reflexionen basierend auf deiner emotionalen Reise freizuschalten.",
    upgrade_button: "Auf VIP upgraden",
    today: "Heutige Reflexion",
    no_reflection: "Noch keine Reflexion generiert. Schau später vorbei!",
    share: "Teilen",
    past_reflections: "Vergangene Reflexionen",
    loading: "Lade deine Reflexionen..."
  }
};

const Reflections = () => {
  const { user } = useCurrentUser();
  const { subscriptionTier } = useSubscription();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [reflections, setReflections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const t = translations[language];

  const isVIP = subscriptionTier === 'vip';

  useEffect(() => {
    if (user && isVIP) {
      loadReflections();
    } else {
      setLoading(false);
    }
  }, [user, isVIP]);

  const loadReflections = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("ai_reflections")
        .select("*")
        .eq("user_id", user.id)
        .order("reflection_date", { ascending: false })
        .limit(30);

      if (error) throw error;
      
      // Mock data for now since edge function not implemented yet
      const mockReflections = [
        {
          id: "1",
          content: "Your confessions this week show a pattern of growth and self-awareness. You're becoming more comfortable expressing vulnerable emotions.",
          tone_summary: "hopeful, reflective",
          reflection_date: new Date().toISOString().split('T')[0],
          generated_at: new Date().toISOString()
        }
      ];
      
      setReflections(data && data.length > 0 ? data : mockReflections);
    } catch (error) {
      console.error("Error loading reflections:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = (reflection: any) => {
    if (navigator.share) {
      navigator.share({
        title: t.today,
        text: reflection.content
      });
    }
  };

  if (!user) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p>Please sign in to view reflections.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!isVIP) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="border-purple-500/20">
            <CardContent className="p-8 text-center space-y-4">
              <div className="relative inline-block">
                <Lock className="h-16 w-16 text-purple-500 mx-auto" />
                <Sparkles className="h-6 w-6 text-purple-500 absolute -top-2 -right-2 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold">{t.vip_only}</h2>
              <p className="text-muted-foreground blur-sm select-none">
                {t.upgrade_message}
              </p>
              <Button
                onClick={() => navigate("/profile")}
                className="bg-purple-500 hover:bg-purple-600"
              >
                {t.upgrade_button}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-6 w-6 text-purple-500" />
          <h1 className="text-3xl font-bold">{t.title}</h1>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">{t.loading}</p>
            </CardContent>
          </Card>
        ) : reflections.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t.no_reflection}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reflections.map((reflection, index) => (
              <Card key={reflection.id} className={index === 0 ? "border-purple-500/50" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {index === 0 ? t.today : new Date(reflection.reflection_date).toLocaleDateString()}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleShare(reflection)}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {reflection.tone_summary && (
                    <p className="text-sm text-muted-foreground italic">
                      {reflection.tone_summary}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-base leading-relaxed">{reflection.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Reflections;
