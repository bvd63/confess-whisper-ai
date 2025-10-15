import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { XCircle, ArrowLeft, CreditCard } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const PaymentCanceled = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center bg-card border-border/50 shadow-[var(--shadow-soft)]">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted">
            <XCircle className="w-10 h-10 text-muted-foreground" />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-3 text-foreground">
          {t.payment_canceled_title}
        </h1>

        <p className="text-muted-foreground mb-8">
          {t.payment_canceled_desc}
        </p>

        <div className="space-y-3">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="w-full gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.payment_back_home}
          </Button>

          <Button
            onClick={() => navigate("/profile")}
            className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <CreditCard className="w-4 h-4" />
            {t.payment_try_again}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          {t.payment_contact_help}
        </p>
      </Card>
    </div>
  );
};

export default PaymentCanceled;
