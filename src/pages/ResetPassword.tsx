import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatedCard } from "@/components/AnimatedCard";
import { GradientText } from "@/components/GradientText";
import { EnhancedButton } from "@/components/EnhancedButton";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, Lock, Loader2, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePasswordValidation, validatePasswordStrength } from "@/hooks/usePasswordValidation";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";
import { PasswordRulesChecklist } from "@/components/PasswordRulesChecklist";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedAuth } from "@/hooks/useEnhancedAuth";
import { cn } from "@/lib/utils";

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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);

  const passwordValidation = usePasswordValidation(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  useEffect(() => {
    // Check if we have the required parameters from Supabase
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');
    const hashFragment = window.location.hash;
    
    // Modern Supabase uses token_hash in query params OR access_token in hash
    const hasValidToken = (tokenHash && type === 'recovery') || 
                          (hashFragment && hashFragment.includes('access_token='));
    
    if (!hasValidToken) {
      setTokenValid(false);
      setError(t.auth_reset_token_invalid);
    }
  }, [t, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePasswordStrength(password)) {
      setError(t.auth_password_min);
      return;
    }

    if (!passwordsMatch) {
      setError(t.auth_password_match_fail);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      // Revoke all existing sessions after password reset for security
      await revokeAllSessions();

      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    } catch (err: any) {
      setError(err.message || t.auth_error_generic);
    } finally {
      setIsLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
        <AnimatedCard
          hover="glow"
          glass
          className="w-full max-w-md p-8 rounded-3xl shadow-elevated border-border/50"
        >
          <div className="text-center space-y-4 sm:space-y-6 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-destructive/10 mb-2">
              <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-destructive animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                {t.auth_reset_token_invalid || "Invalid or Expired Reset Link"}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t.auth_reset_token_expired || "This reset link has expired. Please request a new one."}
              </p>
            </div>

            <Alert className="border-primary/20 bg-primary/5 text-left">
              <AlertDescription className="text-xs sm:text-sm space-y-2">
                <p className="font-medium">Reset links expire for security reasons:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Links are valid for 1 hour</li>
                  <li>Each link can only be used once</li>
                  <li>Request a new link if this one expired</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <EnhancedButton
                onClick={() => navigate('/forgot-password')}
                className="flex-1"
                glow
              >
                {t.auth_forgot_password || "Request New Link"}
              </EnhancedButton>
              <EnhancedButton
                onClick={() => navigate('/auth')}
                variant="outline"
                className="flex-1"
              >
                {t.auth_back_to_login || "Back to Login"}
              </EnhancedButton>
            </div>
          </div>
        </AnimatedCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
      <AnimatedCard
        hover="glow"
        glass
        className="w-full max-w-md p-8 rounded-3xl shadow-elevated border-border/50"
      >
        {/* Logo & Title */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 mb-6 shadow-glow">
            <span className="text-5xl">💜</span>
          </div>
          <h1 className="text-3xl font-bold mb-3 gradient-text">
            {t.auth_reset_password_title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t.auth_reset_password_desc}
          </p>
        </div>

        {success ? (
          <Alert className="border-green-500/20 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-600 dark:text-green-400">
              {t.auth_reset_password_success}
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* New Password Field */}
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={t.auth_reset_password_new}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  className="pl-10 pr-10"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? t.auth_hide_password : t.auth_show_password}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Strength and Rules */}
              {password.length > 0 && (
                <div className="space-y-3 pt-2">
                  <PasswordStrengthMeter
                    strength={passwordValidation.strength}
                    strengthScore={passwordValidation.strengthScore}
                  />
                  <PasswordRulesChecklist rules={passwordValidation.rules} />
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t.auth_reset_password_confirm}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                  }}
                  onPaste={(e) => e.preventDefault()}
                  className="pl-10 pr-10"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showConfirmPassword ? t.auth_hide_password : t.auth_show_password}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Match Indicator */}
              {confirmPassword.length > 0 && (
                <p className={cn(
                  "text-xs flex items-center gap-1.5",
                  passwordsMatch ? "text-green-600 dark:text-green-500" : "text-destructive"
                )}>
                  {passwordsMatch ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {t.auth_password_match_ok}
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                      {t.auth_password_match_fail}
                    </>
                  )}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <EnhancedButton
              type="submit"
              className="w-full"
              disabled={isLoading || !passwordValidation.allRulesPassed || !passwordsMatch}
              glow
              lift
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.auth_creating_account}
                </>
              ) : (
                t.auth_reset_password_button
              )}
            </EnhancedButton>
          </form>
        )}
      </AnimatedCard>
    </div>
  );
}
