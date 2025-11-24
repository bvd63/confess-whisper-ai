import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { EnhancedButton } from "@/components/EnhancedButton";
import { AnimatedCard } from "@/components/AnimatedCard";
import { GradientText } from "@/components/GradientText";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, Mail, Lock, Loader2, Sparkles, Eye, EyeOff, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";
import { Turnstile } from "@marsidev/react-turnstile";
import { usePasswordValidation, validatePasswordStrength } from "@/hooks/usePasswordValidation";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";
import { PasswordRulesChecklist } from "@/components/PasswordRulesChecklist";
import { cn } from "@/lib/utils";
import { useEnhancedAuth } from "@/hooks/useEnhancedAuth";
import { logError } from "@/lib/logger";
import { env } from "@/lib/env";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { enhancedLogin, checkCaptchaRequired } = useEnhancedAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [staySignedIn, setStaySignedIn] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [turnstileError, setTurnstileError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "", confirmPassword: "", captcha: "" });
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const [showLoginCaptcha, setShowLoginCaptcha] = useState(false);

  const passwordValidation = usePasswordValidation(password);
  const emailSchema = z.string().email(t.auth_invalid_email);

  const checkUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const passwordsDontMatch = confirmPassword.length > 0 && !passwordsMatch;

  const validateForm = (): boolean => {
    const newErrors = { email: "", password: "", confirmPassword: "", captcha: "" };
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    if (!isLogin) {
      if (!validatePasswordStrength(password)) {
        newErrors.password = t.auth_password_min;
      }

      if (!passwordsMatch) {
        newErrors.confirmPassword = t.auth_password_match_fail;
      }

      if (!captchaToken) {
        newErrors.captcha = t.auth_captcha_failed;
      }
    }

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password && !newErrors.confirmPassword && !newErrors.captcha;
  };

  const isFormValid = (): boolean => {
    if (isLogin) {
      const basicValid = !!email && !!password;
      if (showLoginCaptcha) {
        return basicValid && !!captchaToken;
      }
      return basicValid;
    }
    return (
      !!email &&
      passwordValidation.allRulesPassed &&
      passwordsMatch &&
      !!captchaToken &&
      acceptTerms
    );
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (isLogin) {
        // Check if CAPTCHA is required for this email
        const captchaRequired = await checkCaptchaRequired(email.trim());
        
        if (captchaRequired && !captchaToken) {
          setShowLoginCaptcha(true);
          toast({
            title: t.auth_error,
            description: t.auth_captcha_failed,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Use enhanced login for better security and session tracking
        const { data, error } = await enhancedLogin(
          email.trim(),
          password,
          captchaToken,
          {
            stayConnected: staySignedIn,
            deviceId: localStorage.getItem('device_id') || undefined,
          }
        );

        if (error) {
          // Increment failed attempts and show captcha after 3 attempts
          const newAttempts = failedLoginAttempts + 1;
          setFailedLoginAttempts(newAttempts);
          if (newAttempts >= 3) {
            setShowLoginCaptcha(true);
          }

          // Set inline error message on password field using translated message
          const message =
            typeof error === 'object' && error !== null && 'message' in error &&
            typeof (error as { message?: unknown }).message === 'string'
              ? (error as { message: string }).message
              : t.auth_invalid_credentials;
          setErrors((prev) => ({ ...prev, password: message }));

          // Error already handled by useEnhancedAuth hook with toast
          setIsLoading(false);
          return;
        }

        // Reset failed attempts on successful login
        setFailedLoginAttempts(0);
        setShowLoginCaptcha(false);

        // Award streak bonus if applicable
        if (data?.user?.id) {
          try {
            const { data: streakData } = await supabase
              .from('user_streaks')
              .select('current_streak')
              .eq('user_id', data.user.id)
              .single();
            
            if (streakData?.current_streak) {
              const { onDailyLogin } = await import('@/services/authHooks');
              await onDailyLogin({ 
                userId: data.user.id, 
                currentStreak: streakData.current_streak 
              });
            }
          } catch (err) {
            logError('Error checking streak bonus', err as Error);
          }
        }

        navigate('/');
      } else {
        // Server-side validation before signup
        const { data: validationResult, error: validationError } = await supabase.functions.invoke('enhanced-auth?action=validate-signup', {
          body: { 
            email: email.trim(),
            password,
            captchaToken,
          },
        });

        if (validationError || validationResult?.error) {
          const errorMsg = validationResult?.messageKey 
            ? t[validationResult.messageKey.replace(/\./g, '_') as keyof typeof t] as string 
            : t.auth_error_generic;
          throw new Error(errorMsg);
        }

        // Proceed with signup after validation passes
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              staySignedIn,
            },
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            throw new Error(t.auth_email_exists);
          }
          throw error;
        }

        // Store stay logged in preference for later
        if (staySignedIn) {
          localStorage.setItem('stay_logged_in', 'true');
        }

        // Process referral code if exists
        const referralCode = localStorage.getItem('referralCode');
        if (referralCode) {
          try {
            await supabase.functions.invoke('process-referral', {
              body: { referralCode },
            });
            localStorage.removeItem('referralCode');
          } catch (refError) {
            logError('Error processing referral', refError as Error);
          }
        }

        toast({
          title: t.auth_signup_success,
          description: t.auth_check_email_verify,
          duration: 6000,
        });
        
        // Don't auto-navigate - user needs to verify email first
      }
    } catch (error) {
      // Only show toast for signup errors (login errors already handled by useEnhancedAuth)
      if (!isLogin) {
        const description = error instanceof Error ? error.message : t.auth_error_generic;
        toast({
          title: t.auth_error,
          description,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeSwitch = () => {
    setIsLogin(!isLogin);
    setPassword("");
    setConfirmPassword("");
    setCaptchaToken("");
    setTurnstileError(false);
    setFailedLoginAttempts(0);
    setShowLoginCaptcha(false);
    setErrors({ email: "", password: "", confirmPassword: "", captcha: "" });
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
            <GradientText variant="hero">Confess+</GradientText>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isLogin ? t.auth_welcome_back : t.auth_create_account}
          </p>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleAuth} className="space-y-4">
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
                  setErrors(prev => ({ ...prev, email: "" }));
                }}
                className="pl-10"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={t.auth_password_placeholder}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors(prev => ({ ...prev, password: "" }));
                }}
                className="pl-10 pr-10"
                disabled={isLoading}
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? t.auth_hide_password : t.auth_show_password}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}

            {/* Password Strength and Rules for Signup */}
            {!isLogin && password.length > 0 && (
              <div className="space-y-3 pt-2">
                <PasswordStrengthMeter 
                  strength={passwordValidation.strength}
                  strengthScore={passwordValidation.strengthScore}
                />
                <PasswordRulesChecklist rules={passwordValidation.rules} />
              </div>
            )}
          </div>

          {/* Confirm Password Field (Signup only) */}
          {!isLogin && (
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t.auth_confirm_password_placeholder}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrors(prev => ({ ...prev, confirmPassword: "" }));
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
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
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
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          {/* Stay Signed In */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="stay-signed-in"
                checked={staySignedIn}
                onCheckedChange={(checked) => setStaySignedIn(checked === true)}
                disabled={isLoading}
              />
              <Label
                htmlFor="stay-signed-in"
                className="text-sm cursor-pointer select-none"
              >
                {isLogin ? "Stay logged in" : t.auth_stay_signed_in}
              </Label>
            </div>
            
            {/* Forgot Password Link - Login Only */}
            {isLogin && (
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-xs text-primary hover:underline"
                disabled={isLoading}
              >
                {t.auth_forgot_password}
              </button>
            )}
          </div>

          {/* Terms & Privacy - Signup Only */}
          {!isLogin && (
            <div className="flex items-start space-x-2">
              <Checkbox
                id="accept-terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                disabled={isLoading}
                className="mt-0.5"
              />
              <Label
                htmlFor="accept-terms"
                className="text-xs cursor-pointer select-none text-muted-foreground leading-relaxed"
              >
                By signing up you agree to our{" "}
                <a href="/terms" target="_blank" className="text-primary hover:underline">
                  Terms
                </a>{" "}
                and{" "}
                <a href="/privacy" target="_blank" className="text-primary hover:underline">
                  Privacy Policy
                </a>
              </Label>
            </div>
          )}

          {/* Turnstile CAPTCHA (Signup always, Login after 3 failed attempts) */}
          {(!isLogin || showLoginCaptcha) && (
            <div className="space-y-2">
              {showLoginCaptcha && (
                <Alert className="mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t.auth_captcha_required_after_fails || "Please verify you're human to continue"}
                  </AlertDescription>
                </Alert>
              )}
              {turnstileError && (
                <Alert variant="destructive" className="mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t.auth_captcha_failed}
                  </AlertDescription>
                </Alert>
              )}
              <Turnstile
                siteKey={env.client.turnstileSiteKey ?? "1x00000000000000000000AA"}
                onSuccess={(token) => {
                  setCaptchaToken(token);
                  setTurnstileError(false);
                  setErrors(prev => ({ ...prev, captcha: "" }));
                }}
                onError={() => {
                  setCaptchaToken("");
                  setTurnstileError(true);
                  setErrors(prev => ({ ...prev, captcha: t.auth_captcha_failed }));
                }}
                onExpire={() => {
                  setCaptchaToken("");
                  setTurnstileError(true);
                  setErrors(prev => ({ ...prev, captcha: t.auth_captcha_failed }));
                }}
                options={{
                  theme: 'auto',
                  size: 'normal',
                }}
              />
              {errors.captcha && !turnstileError && (
                <p className="text-xs text-destructive">{errors.captcha}</p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <EnhancedButton
            type="submit"
            className="w-full"
            disabled={isLoading || !isFormValid()}
            glow
            lift
            shine
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isLogin ? t.auth_logging_in : t.auth_creating_account}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-pulse-glow" />
                {isLogin ? t.auth_login_button : t.auth_signup_button}
              </>
            )}
          </EnhancedButton>
        </form>

        {/* Toggle Login/Signup */}
        <div className="mt-6 text-center">
          <button
            onClick={handleModeSwitch}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
            disabled={isLoading}
          >
            {isLogin ? (
              <>
                {t.auth_no_account} <span className="text-primary font-medium">{t.auth_signup_link}</span>
              </>
            ) : (
              <>
                {t.auth_have_account} <span className="text-primary font-medium">{t.auth_login_link}</span>
              </>
            )}
          </button>
        </div>

        {/* Benefits for new users */}
        {!isLogin && (
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border/50">
            <p className="text-[10px] sm:text-xs text-center text-muted-foreground mb-2 sm:mb-3">
              {t.auth_benefits_title}
            </p>
            <div className="space-y-1.5 sm:space-y-2 text-[10px] sm:text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <span>{t.auth_benefit_unlimited}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <span>{t.auth_benefit_ai_responses}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <span>{t.auth_benefit_community}</span>
              </div>
            </div>
          </div>
        )}
      </AnimatedCard>
    </div>
  );
};

export default Auth;
