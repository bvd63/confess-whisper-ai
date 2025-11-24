import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatedCard } from "@/components/AnimatedCard";
import { GradientText } from "@/components/GradientText";
import { EnhancedButton } from "@/components/EnhancedButton";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, Mail, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Turnstile } from "@marsidev/react-turnstile";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { logError, logWarn } from "@/lib/logger";
import { env } from "@/lib/env";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail() || !captchaToken) {
      if (!captchaToken) setError(t.auth_captcha_failed);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.functions.invoke("enhanced-auth?action=request-password-reset", {
        body: {
          email: email.trim(),
          captchaToken,
        },
      });

      if (error) {
        let errorMessage = t.auth_error_generic;
        if (error instanceof FunctionsHttpError && error.context?.response) {
          try {
            const details = await error.context.response.json();
            const messageKey = details?.messageKey as string | undefined;
            if (messageKey) {
              const translationKey = messageKey.replace(/\./g, "_");
              errorMessage = (t[translationKey as keyof typeof t] as string) || errorMessage;
            } else if (details?.error === "RATE_LIMIT") {
              errorMessage = t.common_rate_limit;
            }
          } catch (parseError) {
            logWarn("Failed to parse password reset error", { error: parseError });
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
        setError(errorMessage);
        if (error instanceof FunctionsHttpError) {
          setCaptchaToken("");
        }
        return;
      }

      if (data?.error) {
        const translationKey = data.messageKey?.replace(/\./g, "_");
        setError(
          translationKey && (t[translationKey as keyof typeof t] as string)
            ? (t[translationKey as keyof typeof t] as string)
            : t.auth_error_generic
        );
        return;
      }

      setSuccess(true);
      setCaptchaToken("");
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error('Password reset error');
      logError("Password reset request failed", errorInstance);
      setError(err instanceof Error && err.message ? err.message : t.auth_error_generic);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-mesh flex items-center justify-center p-3 sm:p-4">
      <AnimatedCard
        hover="glow"
        glass
        className="w-full max-w-md p-4 sm:p-6 md:p-8 border-primary/20"
      >
        {/* Logo & Title */}
        <div className="text-center mb-6 sm:mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-3 sm:mb-4">
            <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-primary animate-heart-beat" fill="currentColor" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            <GradientText variant="hero">{t.auth_forgot_password_title}</GradientText>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t.auth_forgot_password_desc}
          </p>
        </div>

        {success ? (
          <div className="space-y-4">
            <Alert className="border-green-500/20 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-600 dark:text-green-400">
                {t.auth_forgot_password_success}
              </AlertDescription>
            </Alert>
            
            <EnhancedButton
              type="button"
              onClick={() => navigate('/auth')}
              className="w-full"
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.auth_back_to_login}
            </EnhancedButton>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder={t.auth_email_placeholder}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  className="pl-10"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
              {error && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </p>
              )}
            </div>

            {/* CAPTCHA */}
            <div className="space-y-2">
              <Turnstile
                siteKey={env.client.turnstileSiteKey ?? "1x00000000000000000000AA"}
                onSuccess={(token) => {
                  setCaptchaToken(token);
                  setError("");
                }}
                onError={() => {
                  setCaptchaToken("");
                  setError(t.auth_captcha_failed);
                }}
                onExpire={() => {
                  setCaptchaToken("");
                  setError(t.auth_captcha_failed);
                }}
                options={{
                  theme: 'auto',
                  size: 'normal',
                }}
              />
            </div>

            {/* Submit Button */}
            <EnhancedButton
              type="submit"
              className="w-full"
              disabled={isLoading || !email || !captchaToken}
              glow
              lift
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.auth_logging_in}
                </>
              ) : (
                t.auth_forgot_password_button
              )}
            </EnhancedButton>

            {/* Back to Login */}
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="w-full text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              <ArrowLeft className="w-3 h-3" />
              {t.auth_back_to_login}
            </button>
          </form>
        )}
      </AnimatedCard>
    </div>
  );
}
