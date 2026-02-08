import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { validatePasswordStrength } from "@/hooks/usePasswordValidation";
import { logError } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";

type ResetStatus = "checking" | "ready" | "invalid";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [status, setStatus] = useState<ResetStatus>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ password: "", confirmPassword: "" });
  const [success, setSuccess] = useState(false);

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  // Listen for Supabase PASSWORD_RECOVERY event and session
  useEffect(() => {
    let isMounted = true;
    let resolved = false;

    const resolve = (nextStatus: ResetStatus) => {
      if (!isMounted || resolved) return;
      resolved = true;
      setStatus(nextStatus);
    };

    // 1) Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        resolve("ready");
      }
    });

    // 2) Also check existing session after a microtask (Supabase may have already processed the fragment)
    const sessionCheck = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          resolve("ready");
        }
      } catch (err) {
        logError("Session check failed during reset", err as Error);
      }
    }, 100);

    // 3) Timeout fallback: if neither event nor session after 2s, mark invalid
    const timeout = setTimeout(() => {
      resolve("invalid");
    }, 2000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(sessionCheck);
      clearTimeout(timeout);
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
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        // If the session has expired during the form fill
        if (error.message?.toLowerCase().includes("session") || error.status === 401) {
          setStatus("invalid");
          return;
        }
        setErrors(prev => ({ ...prev, password: error.message || t.auth_reset_password_error || t.auth_error_generic }));
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

  // --- Checking / Validating state ---
  if (status === "checking") {
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
            <p className="text-sm text-muted-foreground">{t.auth_validating_reset_link}</p>
          </div>
        </div>
      </div>
    );
  }

  // --- Invalid / expired token state ---
  if (status === "invalid") {
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
              {t.auth_reset_token_invalid}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {t.auth_reset_token_expired}
            </p>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/forgot-password')}
                className="w-full h-14 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-base shadow-[0_0_30px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.7)] transition-all duration-300"
              >
                {t.auth_forgot_password}
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="w-full h-14 rounded-full bg-muted/50 border border-muted-foreground/20 text-foreground font-medium text-base hover:bg-muted/70 transition-colors"
              >
                {t.auth_back_to_login}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Success state ---
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

  // --- Main reset form (status === "ready") ---
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
            {t.auth_reset_password_desc}
          </p>

          <form onSubmit={handleSubmit} className="space-y-1">
            {/* New Password Input */}
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
              <div className="min-h-[1rem] mt-1 px-6">
                {errors.password && (
                  <p className="text-xs leading-4 text-rose-500/80 dark:text-rose-400/70">{errors.password}</p>
                )}
              </div>
            </div>

            {/* Confirm Password Input */}
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
              <div className="min-h-[1rem] mt-1 px-6">
                {errors.confirmPassword && (
                  <p className="text-xs leading-4 text-rose-500/80 dark:text-rose-400/70">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
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

          {/* Back to login */}
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
