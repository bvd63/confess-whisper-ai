import { getSupabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PasswordResetPage = () => {
  const supabase = getSupabase();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t.passwordReset_emailSent);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t.passwordReset_title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              type="email"
              placeholder={t.passwordReset_emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button onClick={handlePasswordReset} disabled={loading} className="w-full">
              {loading ? t.passwordReset_loading : t.passwordReset_submitButton}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PasswordResetPage;
