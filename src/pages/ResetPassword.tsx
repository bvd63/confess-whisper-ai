import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { validatePasswordStrength } from "@/hooks/usePasswordValidation";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedAuth } from "@/hooks/useEnhancedAuth";
import { cn } from "@/lib/utils";
import { logError } from "@/lib/logger";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { revokeAllSessions } = useEnhancedAuth();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ password: "", confirmPassword: "" });
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  const redirectTimeoutRef = useRef<number | null>(null);

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const markResetLinkInvalid = () => {
    setTokenValid(false);
    setSuccess(false);
  };

  const isExpiredOrInvalidResetError = (err: { message?: string; status?: number; code?: string } | null) => {
    if (!err) return false;
    const messageSource = err.message || (err as any)?.error_description || "";
    const normalizedMessage = typeof messageSource === "string" ? messageSource.toLowerCase() : "";
    return normalizedMessage.includes("expired")
      || normalizedMessage.includes("invalid")
      || err.code === "expired_token"
      || err.code === "invalid_token"
      || err.status === 401
      || err.status === 410;
  };

  useEffect(() => {
    let isMounted = true;

    const establishRecoverySession = async () => {
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      const hashFragment = window.location.hash;
      const fragmentParams = new URLSearchParams(hashFragment.replace(/^#/u, ''));
      const accessToken = fragmentParams.get('access_token');
      const refreshToken = fragmentParams.get('refresh_token');

      const hasIncomingSession = Boolean((tokenHash && type === 'recovery') || (accessToken && refreshToken));

      if (!hasIncomingSession) {
        if (isMounted) markResetLinkInvalid();
        return;
      }

      try {
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
          window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
        } else if (tokenHash && type === 'recovery') {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (otpError) throw otpError;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('missing_recovery_session');

        if (isMounted) {
          setTokenValid(true);
        }
      } catch (sessionError) {
        logError('Password recovery session error', sessionError as Error);
        if (isMounted) markResetLinkInvalid();
      }
    };

    establishRecoverySession();
    return () => { isMounted = false; };
  }, [t, searchParams]);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    };
  }, []);

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

    setIsLoading(true);
    setErrors({ password: "", confirmPassword: "" });

    try {
      const { data: sessionCheck } = await supabase.auth.getSession();
      if (!sessionCheck.session) {
        markResetLinkInvalid();
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        if (isExpiredOrInvalidResetError(updateError)) {
          markResetLinkInvalid();
          return;
        }
        throw updateError;
      }

      // Revoke all existing sessions after password reset for security
      try {
        await revokeAllSessions();
      } catch (revokeError) {
        logError('Failed to revoke sessions after password reset', revokeError as Error);
      }

      setSuccess(true);
      setErrors({ password: "", confirmPassword: "" });

      redirectTimeoutRef.current = window.setTimeout(() => {
        navigate('/auth');
      }, 2000);
    } catch (err: any) {
      logError("Password update failed", err as Error);
      if (isExpiredOrInvalidResetError(err)) {
        markResetLinkInvalid();
        return;
      }
      setErrors(prev => ({ ...prev, password: t.auth_reset_password_error || t.auth_error_generic }));
    } finally {
      setIsLoading(false);
    }
  };

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
