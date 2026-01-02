import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { EnhancedButton } from "@/components/EnhancedButton";
import { AnimatedCard } from "@/components/AnimatedCard";
import { GradientText } from "@/components/GradientText";
import { AppLogo } from "@/components/AppLogo";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, Mail, Lock, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
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
const Auth = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    t
  } = useLanguage();
  const {
    enhancedLogin,
    checkCaptchaRequired
  } = useEnhancedAuth();
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
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    captcha: ""
  });
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const [showLoginCaptcha, setShowLoginCaptcha] = useState(false);
  const passwordValidation = usePasswordValidation(password);
  const emailSchema = z.string().email(t.auth_invalid_email);
  useEffect(() => {
    checkUser();
  }, []);
  const checkUser = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (user) {
      navigate('/');
    }
  };
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const passwordsDontMatch = confirmPassword.length > 0 && !passwordsMatch;
  const validateForm = (): boolean => {
    const newErrors = {
      email: "",
      password: "",
      confirmPassword: "",
      captcha: ""
    };
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
    return !!email && passwordValidation.allRulesPassed && passwordsMatch && !!captchaToken && acceptTerms;
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
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        // Use enhanced login for better security and session tracking
        const {
          data,
          error
        } = await enhancedLogin(email.trim(), password, captchaToken, {
          stayConnected: staySignedIn,
          deviceId: localStorage.getItem('device_id') || undefined
        });
        if (error) {
          // Increment failed attempts and show captcha after 3 attempts
          const newAttempts = failedLoginAttempts + 1;
          setFailedLoginAttempts(newAttempts);
          if (newAttempts >= 3) {
            setShowLoginCaptcha(true);
          }

          // Set inline error message on password field using translated message
          const message = (error as any)?.message || t.auth_invalid_credentials;
          setErrors(prev => ({
            ...prev,
            password: message
          }));

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
            const {
              data: streakData
            } = await supabase.from('user_streaks').select('current_streak').eq('user_id', data.user.id).single();
            if (streakData?.current_streak) {
              const {
                onDailyLogin
              } = await import('@/services/authHooks');
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
        const {
          data: validationResult,
          error: validationError
        } = await supabase.functions.invoke('enhanced-auth?action=validate-signup', {
          body: {
            email: email.trim(),
            password,
            captchaToken
          }
        });
        if (validationError || validationResult?.error) {
          const errorMsg = validationResult?.messageKey ? t[validationResult.messageKey.replace(/\./g, '_') as keyof typeof t] as string : t.auth_error_generic;
          throw new Error(errorMsg);
        }

        // Proceed with signup after validation passes
        const {
          error
        } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              staySignedIn
            }
          }
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
              body: {
                referralCode
              }
            });
            localStorage.removeItem('referralCode');
          } catch (refError) {
            logError('Error processing referral', refError as Error);
          }
        }
        toast({
          title: t.auth_signup_success,
          description: t.auth_check_email_verify,
          duration: 6000
        });

        // Don't auto-navigate - user needs to verify email first
      }
    } catch (error: any) {
      // Only show toast for signup errors (login errors already handled by useEnhancedAuth)
      if (!isLogin) {
        toast({
          title: t.auth_error,
          description: error.message || t.auth_error_generic,
          variant: "destructive"
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
    setErrors({
      email: "",
      password: "",
      confirmPassword: "",
      captcha: ""
    });
  };
  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: t.auth_error,
        description: error.message || t.auth_error_generic,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // LOGIN UI - Matches reference image
  if (isLogin) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center px-6 pb-10">
        <div className="max-w-sm mx-auto w-full">
          {/* App Name - Simple centered text */}
          <h1 className="text-3xl font-bold text-center mb-10">
            <span className="text-foreground">Confess</span>
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">AI</span>
          </h1>

          <form onSubmit={handleAuth} className="space-y-4">
            {/* Email Input - Pill Style */}
            <div className="space-y-2">
              <Input
                type="email"
                placeholder={t.auth_email_placeholder}
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setErrors(prev => ({ ...prev, email: "" }));
                }}
                className="h-14 rounded-full px-6 text-base bg-muted/50 border-muted-foreground/20 focus:border-primary focus:ring-primary/30"
                disabled={isLoading}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-destructive flex items-center gap-2 px-2">
                  <AlertCircle className="w-4 h-4" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Input - Pill Style */}
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={t.auth_password_placeholder}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setErrors(prev => ({ ...prev, password: "" }));
                  }}
                  className="h-14 rounded-full px-6 pr-12 text-base bg-muted/50 border-muted-foreground/20 focus:border-primary focus:ring-primary/30"
                  disabled={isLoading}
                  autoComplete="current-password"
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
              {errors.password && (
                <p className="text-sm text-destructive flex items-center gap-2 px-2">
                  <AlertCircle className="w-4 h-4" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Stay Logged In + Forgot Password Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="stay-logged-in-login"
                  checked={staySignedIn}
                  onCheckedChange={checked => setStaySignedIn(checked === true)}
                  disabled={isLoading}
                />
                <Label htmlFor="stay-logged-in-login" className="text-sm cursor-pointer select-none text-muted-foreground">
                  {t.auth_stay_signed_in}
                </Label>
              </div>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm text-primary hover:underline"
                disabled={isLoading}
              >
                {t.auth_forgot_password}
              </button>
            </div>

            {/* Login Captcha if needed */}
            {showLoginCaptcha && (
              <div className="space-y-2">
                <Alert className="mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t.auth_captcha_required_after_fails || "Please verify you're human to continue"}
                  </AlertDescription>
                </Alert>
                {turnstileError && (
                  <Alert variant="destructive" className="mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{t.auth_captcha_failed}</AlertDescription>
                  </Alert>
                )}
                <Turnstile
                  siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
                  onSuccess={token => {
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
                  options={{ theme: 'auto', size: 'normal' }}
                />
              </div>
            )}

            {/* Primary Login Button - Gradient with Glow */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading || !isFormValid()}
                className="w-full h-14 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-base shadow-[0_0_30px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.7)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t.auth_logging_in}
                  </span>
                ) : (
                  t.auth_login_button || "Log in"
                )}
              </button>
            </div>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full h-14 rounded-full bg-muted/50 border border-muted-foreground/20 text-foreground font-medium text-base flex items-center justify-center gap-3 hover:bg-muted/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </form>

          {/* Bottom Sign Up Link */}
          <div className="mt-10 text-center">
            <button
              onClick={handleModeSwitch}
              className="text-sm text-muted-foreground"
              disabled={isLoading}
            >
              {t.auth_no_account}{" "}
              <span className="text-primary font-medium hover:underline">
                {t.auth_signup_link}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SIGNUP UI - Keep existing layout unchanged
  return <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <AnimatedCard hover="glow" glass className="w-full max-w-md p-8 sm:p-10 border-primary/20 rounded-2xl">
        {/* Logo & Title */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-primary via-primary-hover to-primary-pressed shadow-lg shadow-primary/25">
            <Heart className="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="currentColor" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            <AppLogo className="bg-gradient-to-r from-primary to-primary-hover bg-clip-text" />
          </h1>
          <p className="text-base text-foreground-muted">
            {t.auth_create_account}
          </p>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleAuth} className="space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-4 top-4 w-5 h-5 text-muted-foreground" />
              <Input type="email" placeholder={t.auth_email_placeholder} value={email} onChange={e => {
              setEmail(e.target.value);
              setErrors(prev => ({
                ...prev,
                email: ""
              }));
            }} className="pl-12 h-14 rounded-xl text-base" disabled={isLoading} autoComplete="email" />
            </div>
            {errors.email && <p className="text-sm text-destructive flex items-center gap-2 mt-2">
                <AlertCircle className="w-4 h-4" />
                {errors.email}
              </p>}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-4 top-4 w-5 h-5 text-muted-foreground" />
              <Input type={showPassword ? "text" : "password"} placeholder={t.auth_password_placeholder} value={password} onChange={e => {
              setPassword(e.target.value);
              setErrors(prev => ({
                ...prev,
                password: ""
              }));
            }} className="pl-12 pr-12 h-14 rounded-xl text-base" disabled={isLoading} autoComplete="new-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors" aria-label={showPassword ? t.auth_hide_password : t.auth_show_password} tabIndex={-1}>
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5 px-0 mx-[10px] my-0 mb-[17px]" />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-destructive flex items-center gap-2 mt-2">
                <AlertCircle className="w-4 h-4" />
                {errors.password}
              </p>}

            {/* Password Strength and Rules for Signup */}
            {password.length > 0 && <div className="space-y-3 pt-2">
                <PasswordStrengthMeter strength={passwordValidation.strength} strengthScore={passwordValidation.strengthScore} />
                <PasswordRulesChecklist rules={passwordValidation.rules} />
              </div>}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-4 top-4 w-5 h-5 text-muted-foreground" />
                <Input type={showConfirmPassword ? "text" : "password"} placeholder={t.auth_confirm_password_placeholder} value={confirmPassword} onChange={e => {
              setConfirmPassword(e.target.value);
              setErrors(prev => ({
                ...prev,
                confirmPassword: ""
              }));
            }} onPaste={e => e.preventDefault()} className="pl-12 pr-12 h-14 rounded-xl text-base" disabled={isLoading} autoComplete="new-password" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors" aria-label={showConfirmPassword ? t.auth_hide_password : t.auth_show_password} tabIndex={-1}>
                {showConfirmPassword ? <EyeOff className="w-5 h-5 px-0 mx-[10px] my-0 mb-[17px]" /> : <Eye className="w-5 h-5 px-0 mx-[10px] my-0 mb-[17px]" />}
                </button>
              </div>
              
              {/* Password Match Indicator */}
              {confirmPassword.length > 0 && <p className={cn("text-xs flex items-center gap-1.5", passwordsMatch ? "text-green-600 dark:text-green-500" : "text-destructive")}>
                  {passwordsMatch ? <>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {t.auth_password_match_ok}
                    </> : <>
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                      {t.auth_password_match_fail}
                    </>}
                </p>}
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
            </div>

          {/* Stay Signed In */}
          <div className="flex items-center space-x-2">
            <Checkbox id="stay-signed-in" checked={staySignedIn} onCheckedChange={checked => setStaySignedIn(checked === true)} disabled={isLoading} />
            <Label htmlFor="stay-signed-in" className="text-sm cursor-pointer select-none">
              {t.auth_stay_signed_in}
            </Label>
          </div>

          {/* Terms & Privacy */}
          <div className="flex items-start space-x-2">
              <Checkbox id="accept-terms" checked={acceptTerms} onCheckedChange={checked => setAcceptTerms(checked === true)} disabled={isLoading} className="mt-0.5" />
              <Label htmlFor="accept-terms" className="text-xs cursor-pointer select-none text-muted-foreground leading-relaxed">
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

          {/* Turnstile CAPTCHA */}
          <div className="space-y-2">
              {turnstileError && <Alert variant="destructive" className="mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t.auth_captcha_failed}
                  </AlertDescription>
                </Alert>}
              <Turnstile siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"} onSuccess={token => {
            setCaptchaToken(token);
            setTurnstileError(false);
            setErrors(prev => ({
              ...prev,
              captcha: ""
            }));
          }} onError={() => {
            setCaptchaToken("");
            setTurnstileError(true);
            setErrors(prev => ({
              ...prev,
              captcha: t.auth_captcha_failed
            }));
          }} onExpire={() => {
            setCaptchaToken("");
            setTurnstileError(true);
            setErrors(prev => ({
              ...prev,
              captcha: t.auth_captcha_failed
            }));
          }} options={{
            theme: 'auto',
            size: 'normal'
          }} />
              {errors.captcha && !turnstileError && <p className="text-xs text-destructive">{errors.captcha}</p>}
            </div>

          {/* Submit Button */}
          <EnhancedButton type="submit" className="w-full" disabled={isLoading || !isFormValid()} glow lift shine>
            {isLoading ? <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t.auth_creating_account}
              </> : t.auth_signup_button}
          </EnhancedButton>
        </form>

        {/* Toggle Login/Signup */}
        <div className="mt-6 text-center">
          <button onClick={handleModeSwitch} className="text-sm text-muted-foreground hover:text-primary transition-colors" disabled={isLoading}>
            {t.auth_have_account} <span className="text-primary font-medium">{t.auth_login_link}</span>
          </button>
        </div>

        {/* Benefits for new users */}
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
      </AnimatedCard>
    </div>;
};
export default Auth;