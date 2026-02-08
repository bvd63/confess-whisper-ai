import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Turnstile } from "@marsidev/react-turnstile";
import { z } from "zod";
import { logError } from "@/lib/logger";
import { requestPasswordReset } from "@/services/passwordReset";
import { cn } from "@/lib/utils";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showCaptchaModal, setShowCaptchaModal] = useState(false);
  const [turnstileError, setTurnstileError] = useState(false);

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

  const handleResetRequest = async (token?: string) => {
    setIsLoading(true);
    setError("");
    setTurnstileError(false);
    setShowCaptchaModal(false);

    try {
      const result = await requestPasswordReset({
        email: email.trim(),
        captchaToken: token,
      });

      const captchaRequiredByMessage = result.messageKey === "auth.captcha_required" || result.messageKey === "CAPTCHA_REQUIRED";
      const captchaFailedByMessage = result.messageKey === "auth.captcha_failed";

      if (result.rateLimited) {
        setError(t.auth_reset_rate_limited || t.common_rate_limit);
        setCaptchaToken("");
        return;
      }

      if (result.captchaRequired || captchaRequiredByMessage) {
        setShowCaptchaModal(true);
        setTurnstileError(false);
        setCaptchaToken("");
        return;
      }

      if (result.captchaFailed || captchaFailedByMessage) {
        setShowCaptchaModal(true);
        setTurnstileError(true);
        if (result.shouldResetCaptcha !== false) {
          setCaptchaToken("");
        }
        return;
      }

      if (!result.success) {
        const message = result.messageKey
          ? translateMessageKey(result.messageKey)
          : t.auth_error_generic;
        setError(message);
        setCaptchaToken("");
        return;
      }

      setSuccess(true);
      setShowCaptchaModal(false);
      setCaptchaToken("");
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
    <>
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

            {/* Back to login link - pushed to bottom like Login/Sign Up */}
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

      {/* Captcha Modal - same approach as Sign Up */}
      {showCaptchaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-center mb-2">{t.captcha_verify_human}</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">{t.auth_captcha_verify_prompt}</p>
            <div className="flex justify-center mb-4">
              <Turnstile
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
                onSuccess={(token) => {
                  setCaptchaToken(token);
                  setTurnstileError(false);
                  handleResetRequest(token);
                }}
                onError={() => {
                  setCaptchaToken("");
                  setTurnstileError(true);
                }}
                onExpire={() => {
                  setCaptchaToken("");
                  setTurnstileError(true);
                }}
                options={{ theme: 'auto', size: 'normal' }}
              />
            </div>
            {turnstileError && (
              <p className="text-sm text-destructive text-center mb-4">{t.auth_captcha_failed}</p>
            )}
            <button
              type="button"
              onClick={() => {
                setShowCaptchaModal(false);
                setCaptchaToken("");
                setTurnstileError(false);
              }}
              className="w-full h-10 rounded-full border border-muted-foreground/20 text-muted-foreground text-sm hover:bg-muted/50 transition-colors"
            >
              {t.common_cancel}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
