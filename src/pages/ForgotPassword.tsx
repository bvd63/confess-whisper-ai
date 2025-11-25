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
import { logError } from "@/lib/logger";
import { requestPasswordReset } from "@/services/passwordReset";
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

  const translateMessageKey = (messageKey?: string): string => {
    if (!messageKey) return t.auth_error_generic;
    const normalizedKey = messageKey.replace(/\./g, "_");
    const translated = t[normalizedKey as keyof typeof t];
    return typeof translated === "string" ? (translated as string) : t.auth_error_generic;
  };

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
      const result = await requestPasswordReset({
        email: email.trim(),
        captchaToken,
      });

      if (!result.success) {
        const message = result.messageKey === "common.rate_limit"
          ? t.common_rate_limit
          : translateMessageKey(result.messageKey);
        setError(message);
        if (result.shouldResetCaptcha) {
          setCaptchaToken("");
        }
        return;
      }

      setSuccess(true);
      setCaptchaToken("");
    } catch (err: any) {
      logError("Password reset request failed", err as Error);
      setError(err.message || t.auth_error_generic);
    } finally {
      setIsLoading(false);
    }
  };

  const turnstileSiteKey = env.client.turnstileSiteKey || (env.isDev ? "1x00000000000000000000AA" : "");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <AnimatedCard
        hover="glow"
        glass
        className="w-full max-w-md p-6 sm:p-8 border-primary/20"
      >
        {/* Logo & Title */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-4">
            <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-primary animate-heart-beat" fill="currentColor" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            <GradientText variant="hero">{t.auth_forgot_password_title}</GradientText>
          </h1>
          <p className="text-sm text-muted-foreground">
            {t.auth_forgot_password_desc}
          </p>
        </div>

        {success ? (
          <div className="space-y-5">
            <Alert className="border-green-500/20 bg-green-500/10 rounded-xl p-4">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <AlertDescription className="text-green-600 dark:text-green-400 text-sm">
                {t.auth_forgot_password_success}
              </AlertDescription>
            </Alert>
            
            <EnhancedButton
              type="button"
              onClick={() => navigate('/auth')}
              className="w-full h-12 rounded-xl"
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.auth_back_to_login}
            </EnhancedButton>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
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
              {turnstileSiteKey ? (
                <Turnstile
                  siteKey={turnstileSiteKey}
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
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{t.auth_error_generic}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Submit Button */}
            <EnhancedButton
              type="submit"
              className="w-full h-12 rounded-xl font-medium"
              disabled={isLoading || !email || !captchaToken}
              glow
              lift
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.auth_sending_reset_link}
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
