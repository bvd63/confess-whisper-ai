import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Crown, Sparkles } from "lucide-react";

const PaymentSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      navigate("/");
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center bg-gradient-to-br from-card to-primary/5 border-primary/30 shadow-[var(--shadow-glow)]">
        <div className="mb-6 animate-bounce-subtle">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-[var(--shadow-glow)]">
            <CheckCircle className="w-10 h-10 text-primary-foreground" />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Plată Reușită!
        </h1>

        <p className="text-muted-foreground mb-6">
          Felicitări! Contul tău Premium a fost activat cu succes.
        </p>

        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <Crown className="w-5 h-5 text-primary" />
            <span className="text-sm text-foreground">Acces la Deep Insights AI</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm text-foreground">Analize psihologice profunde</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <CheckCircle className="w-5 h-5 text-primary" />
            <span className="text-sm text-foreground">Suport prioritar</span>
          </div>
        </div>

        <Button
          onClick={() => navigate("/")}
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
        >
          Explorează Confess.AI
        </Button>

        <p className="text-xs text-muted-foreground mt-4">
          Vei fi redirecționat automat în 5 secunde...
        </p>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
