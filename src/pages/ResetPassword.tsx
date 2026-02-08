import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { validatePasswordStrength } from "@/hooks/usePasswordValidation";
import { logError } from "@/lib/logger";
import { completePasswordReset, validateResetToken } from "@/services/passwordReset";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ password: "", confirmPassword: "" });
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValue, setTokenValue] = useState("");

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const markResetLinkInvalid = () => {
    setTokenValid(false);
    setSuccess(false);
  };

  const translateMessageKey = (messageKey?: string): string => {
    if (!messageKey) return t.auth_error_generic;
    const normalizedKey = messageKey.replace(/\./g, "_");
    const translated = t[normalizedKey as keyof typeof t];
    return typeof translated === "string" ? translated : t.auth_error_generic;
  };

  useEffect(() => {
    let isMounted = true;
    const tokenParam = searchParams.get('token')?.trim() || '';
    setTokenValue(tokenParam);

    if (!tokenParam) {
      setTokenValid(false);
      setValidatingToken(false);
      return () => { isMounted = false; };
    }

    const validate = async () => {
      try {
        const result = await validateResetToken(tokenParam);
        if (!isMounted) return;
        setTokenValid(result.valid);
      } catch (err) {
        logError('Reset token validation failed', err as Error);
        if (isMounted) setTokenValid(false);
      } finally {
        if (isMounted) setValidatingToken(false);
      }
    };

    validate();

    return () => { isMounted = false; };
  }, [searchParams, t]);

  const validateForm = (): boolean => {
    const newErrors = { password: "", confirmPassword: "" };

    if (!validatePasswordStrength(password)) {
      newErrors.password = t.auth_password_min;
    }
    if (!passwordsMatch) {
      newErrors.confirmPassword = t.auth_password_match_fail;
    }

    setErrors(newErrors);
    return !newErrors.password && !newErrors.confirmPassword;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!tokenValid || !tokenValue) {
      markResetLinkInvalid();
      return;
    }

    setIsLoading(true);
    setErrors({ password: "", confirmPassword: "" });

    try {
      const result = await completePasswordReset({ token: tokenValue, password });

      if (!result.success) {
        if (result.invalidToken) {
          markResetLinkInvalid();
          return;
        }

        const message = translateMessageKey(result.messageKey);
        setErrors(prev => ({ ...prev, password: message }));
        return;
      }

      setSuccess(true);
      setErrors({ password: "", confirmPassword: "" });
    } catch (err: any) {
      logError("Password update failed", err as Error);
      setErrors(prev => ({ ...prev, password: t.auth_reset_password_error || t.auth_error_generic }));
    } finally {
      setIsLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <div className="h-[100dvh] bg-background flex flex-col px-6 overflow-hidden">
        <div className="pt-[8vh] min-[500px]:pt-[10vh]" />
        <h1 className="text-3xl font-bold text-center mb-5 min-[500px]:mb-6">
          <span className="text-foreground">Confess</span>
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">AI</span>
        </h1>
        <div className="max-w-sm mx-auto w-full flex-1 flex flex-col">
          <div className="animate-[fadeSlideIn_150ms_ease-out] text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground">{t.ui_loading}</p>
          </div>
        </div>
      </div>
    );
  }

  // Invalid/expired token state
  if (!tokenValid) {
    return (
      <div className="h-[100dvh] bg-background flex flex-col px-6 overflow-hidden">
        <div className="pt-[8vh] min-[500px]:pt-[10vh]" />
        <h1 className="text-3xl font-bold text-center mb-5 min-[500px]:mb-6">
          <span className="text-foreground">Confess</span>
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">AI</span>
        </h1>
        <div className="max-w-sm mx-auto w-full flex-1 flex flex-col">
          <div className="animate-[fadeSlideIn_150ms_ease-out] text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {t.auth_reset_token_invalid || "Invalid or Expired Reset Link"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {t.auth_reset_token_expired || "This reset link has expired. Please request a new one."}
            </p>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/forgot-password')}
                className="w-full h-14 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-base shadow-[0_0_30px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.7)] transition-all duration-300"
              >
                {t.auth_forgot_password || "Request New Link"}
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="w-full h-14 rounded-full bg-muted/50 border border-muted-foreground/20 text-foreground font-medium text-base hover:bg-muted/70 transition-colors"
              >
                {t.auth_back_to_login || "Back to Login"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <p className="text-sm text-green-600 dark:text-green-400 text-center mb-6">
              {t.auth_reset_password_success}
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

  // Main reset form
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
            {t.auth_reset_password_desc}
          </p>

          <form onSubmit={handleSubmit} className="space-y-1">
            {/* New Password Input - Pill Style matching Sign Up */}
            <div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={t.auth_reset_password_new}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors(prev => ({ ...prev, password: "" }));
                  }}
                  className="h-14 rounded-full px-6 pr-12 text-base bg-muted/50 border-muted-foreground/20 focus:border-primary focus:ring-primary/30"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? t.auth_hide_password : t.auth_show_password}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {/* Error only on submit - Instagram style */}
              <div className="min-h-[1rem] mt-1 px-6">
                {errors.password && (
                  <p className="text-xs leading-4 text-rose-500/80 dark:text-rose-400/70">{errors.password}</p>
                )}
              </div>
            </div>

            {/* Confirm Password Input - Pill Style matching Sign Up */}
            <div>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t.auth_reset_password_confirm}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrors(prev => ({ ...prev, confirmPassword: "" }));
                  }}
                  onPaste={(e) => e.preventDefault()}
                  className="h-14 rounded-full px-6 pr-12 text-base bg-muted/50 border-muted-foreground/20 focus:border-primary focus:ring-primary/30"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showConfirmPassword ? t.auth_hide_password : t.auth_show_password}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {/* Error only on submit - Instagram style */}
              <div className="min-h-[1rem] mt-1 px-6">
                {errors.confirmPassword && (
                  <p className="text-xs leading-4 text-rose-500/80 dark:text-rose-400/70">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Primary Button - Gradient matching Login/Sign Up */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || !password || !confirmPassword}
                className="w-full h-14 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-base shadow-[0_0_30px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.7)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t.auth_updating_password}
                  </span>
                ) : (
                  t.auth_reset_password_button
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
  );
}
