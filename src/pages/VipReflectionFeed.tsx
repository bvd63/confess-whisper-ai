import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Crown } from 'lucide-react';
import { useSubscription } from '@/state/SubscriptionProvider';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function VipReflectionFeed() {
  const { subscriptionTier, isLoading: subLoading } = useSubscription();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [reflections, setReflections] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const isVip = subscriptionTier === 'vip';

  useEffect(() => {
    if (isVip && reflections.length === 0) {
      generateReflection();
    }
  }, [isVip]);

  const generateReflection = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-confession-response', {
        body: {
          text: language === 'es' 
            ? 'Genera una breve reflexión sobre el perdón y la paz interior.'
            : language === 'de'
            ? 'Erstelle eine kurze Reflexion über Vergebung und inneren Frieden.'
            : 'Generate a brief reflection on forgiveness and inner peace.',
          isVip: true,
          locale: language,
        },
      });

      if (error) throw error;
      if (data?.answer) {
        setReflections(prev => [data.answer, ...prev]);
      }
    } catch (error) {
      console.error('Failed to generate reflection:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate reflection',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (subLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isVip) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card className="p-8 text-center">
          <Crown className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-2xl font-bold mb-2">VIP Reflection Feed</h1>
          <p className="text-muted-foreground mb-6">
            {language === 'es'
              ? 'Esta función está disponible solo para miembros VIP.'
              : language === 'de'
              ? 'Diese Funktion ist nur für VIP-Mitglieder verfügbar.'
              : 'This feature is available only for VIP members.'}
          </p>
          <Button onClick={() => window.location.href = '/'}>
            {language === 'es' ? 'Actualizar a VIP' : language === 'de' ? 'Auf VIP upgraden' : 'Upgrade to VIP'}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">
            {language === 'es' ? 'Feed de Reflexión VIP' : language === 'de' ? 'VIP-Reflexions-Feed' : 'VIP Reflection Feed'}
          </h1>
        </div>
        <Button onClick={generateReflection} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {language === 'es' ? 'Nueva Reflexión' : language === 'de' ? 'Neue Reflexion' : 'New Reflection'}
        </Button>
      </div>

      <div className="space-y-4">
        {reflections.map((reflection, index) => (
          <Card key={index} className="p-6">
            <p className="text-foreground leading-relaxed">{reflection}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
