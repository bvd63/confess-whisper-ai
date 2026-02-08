import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { z } from "zod";
import { logError } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const emailSchema = z.string().email(t.auth_invalid_email);

  const validateEmail = (): boolean => {
    try {
      emailSchema.parse(email);
      setError("");
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        setError(e.errors[0].message);
      }
      return false;
    }
  };

  const handleResetRequest = async () => {
    setIsLoading(true);
    setError("");

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: window.location.origin + "/reset-password" }
      );

      if (resetError) {
        setError(resetError.message || t.auth_error_generic);
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      logError("Password reset request failed", err as Error);
      setError(t.auth_error_generic);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail()) return;
    handleResetRequest();
  };

  // Success state
  if (success) {
    return (
      <div className="h-[100dvh] bg-background flex flex-col px-6 overflow-hidden">
        <div className="pt-[8vh] min-[500px]:pt-[10vh]" />
        <h1 className="text-3xl font-bold text-center mb-5 min-[500px]:mb-6">
          <span className="text-foreground">Confess</span>
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">AI</span>
        </h1>
        <div className="max-w-sm mx-auto w-full flex-1 flex flex-col">
          <div className="animate-[fadeSlideIn_150ms_ease-out]">
            <p className="text-sm text-muted-foreground text-center mb-6">
              {t.auth_forgot_password_success}
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="w-full h-14 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-base shadow-[0_0_30px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.7)] transition-all duration-300"
              >
                {t.auth_back_to_login}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-background flex flex-col px-6 overflow-hidden">
      <div className="pt-[8vh] min-[500px]:pt-[10vh]" />
      <h1 className="text-3xl font-bold text-center mb-5 min-[500px]:mb-6">
        <span className="text-foreground">Confess</span>
        <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">AI</span>
      </h1>
      <div className="max-w-sm mx-auto w-full flex-1 flex flex-col">
        <div className="animate-[fadeSlideIn_150ms_ease-out]">
          {/* Subtitle */}
          <p className="text-sm text-muted-foreground text-center mb-6">
            {t.auth_forgot_password_desc}
          </p>

          <form onSubmit={handleSubmit} className="space-y-2 min-[500px]:space-y-3">
            {/* Email Input - Pill Style matching Login/Sign Up */}
            <div>
              <Input
                type="email"
                placeholder={t.auth_email_placeholder}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                className="h-14 rounded-full px-6 text-base bg-muted/50 border-muted-foreground/20 focus:border-primary focus:ring-primary/30"
                disabled={isLoading}
                autoComplete="email"
              />
              <p className={cn(
                "text-xs px-3 h-4 leading-4 transition-opacity duration-200",
                error ? "text-rose-500/90 dark:text-rose-400/90 opacity-100" : "opacity-0"
              )}>
                {error || "\u00A0"}
              </p>
            </div>

            {/* Primary Button - Gradient matching Login/Sign Up */}
            <div className="pt-2 min-[500px]:pt-3">
              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full h-14 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-base shadow-[0_0_30px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.7)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t.auth_sending_reset_link}
                  </span>
                ) : (
                  t.auth_forgot_password_button
                )}
              </button>
            </div>
          </form>

          {/* Back to login link */}
          <div className="flex-1" />
          <div className="py-4 min-[500px]:py-6 text-center">
            <button
              onClick={() => navigate('/auth')}
              className="text-sm text-muted-foreground"
              disabled={isLoading}
            >
              {t.auth_back_to_login}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
