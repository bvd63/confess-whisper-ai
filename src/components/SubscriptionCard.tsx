import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { STRIPE_PRICE } from "@/lib/stripe-config";

const translations = {
  en: {
    vip_title: "VIP Subscription",
    vip_price: "$6.99/month",
    vip_features: [
      "Unlimited daily confessions",
      "Priority AI responses",
      "No ads experience"
    ],
    upgrade_button: "Upgrade to VIP",
    loading: "Loading..."
  },
  es: {
    vip_title: "Suscripción VIP",
    vip_price: "$6.99/mes",
    vip_features: [
      "Confesiones diarias ilimitadas",
      "Respuestas AI prioritarias",
      "Experiencia sin anuncios"
    ],
    upgrade_button: "Actualizar a VIP",
    loading: "Cargando..."
  },
  de: {
    vip_title: "VIP-Abonnement",
    vip_price: "6,99 $/Monat",
    vip_features: [
      "Unbegrenzte tägliche Geständnisse",
      "Prioritäre KI-Antworten",
      "Werbefreie Erfahrung"
    ],
    upgrade_button: "Auf VIP upgraden",
    loading: "Lädt..."
  }
};

export const SubscriptionCard = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const t = translations[language];

  const handleUpgrade = async () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to upgrade",
        variant: "destructive"
      });
      return;
    }

    const priceId = STRIPE_PRICE.VIP_MONTHLY;
    if (!priceId) {
      toast({
        title: "Configuration Error",
        description: "Stripe price ID is not configured. Please contact support.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId }
      });

      if (error) throw error;

      if (data?.hasActiveSubscription) {
        toast({
          title: "Active Subscription",
          description: "You already have an active subscription. Redirecting to manage it...",
        });
        // Open customer portal instead
        const { data: portalData } = await supabase.functions.invoke('customer-portal');
        if (portalData?.url) {
          window.open(portalData.url, '_blank');
        }
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="h-6 w-6 text-purple-500" />
          <h3 className="text-xl font-bold">{t.vip_title}</h3>
        </div>
        
        <p className="text-2xl font-bold text-purple-500 mb-4">{t.vip_price}</p>
        
        <div className="space-y-2 mb-6">
          {t.vip_features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>
        
        <Button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full bg-purple-500 hover:bg-purple-600"
        >
          {loading ? t.loading : t.upgrade_button}
        </Button>
      </CardContent>
    </Card>
  );
};
