import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Heart, Mail, Lock, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });

  const emailSchema = z.string().email(t.auth_invalid_email);
  const passwordSchema = z.string().min(6, t.auth_password_min);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      navigate('/');
    }
  };

  const validateForm = () => {
    const newErrors = { email: "", password: "" };
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            throw new Error(t.auth_invalid_credentials);
          }
          throw error;
        }

        toast({
          title: t.auth_login_success,
          description: t.auth_login_success,
        });
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            throw new Error(t.auth_email_exists);
          }
          throw error;
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
            console.error('Error processing referral:', refError);
            // Don't block signup if referral processing fails
          }
        }

        toast({
          title: t.auth_signup_success,
          description: t.auth_welcome_message,
        });
        navigate('/');
      }
    } catch (error: any) {
      toast({
        title: t.auth_error,
        description: error.message || t.auth_error_generic,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center p-3 sm:p-4">
      <Card className="w-full max-w-md p-4 sm:p-6 md:p-8 bg-card/95 backdrop-blur-sm border-primary/20 shadow-[var(--shadow-soft)] animate-fade-in">
        {/* Logo & Title */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-3 sm:mb-4">
            <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="currentColor" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
            Confess+
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isLogin ? t.auth_welcome_back : t.auth_create_account}
          </p>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleAuth} className="space-y-4">
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
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                type="password"
                placeholder={t.auth_password_placeholder}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors(prev => ({ ...prev, password: "" }));
                }}
                className="pl-10"
                disabled={isLoading}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-[var(--shadow-glow)]"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isLogin ? t.auth_logging_in : t.auth_creating_account}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {isLogin ? t.auth_login_button : t.auth_signup_button}
              </>
            )}
          </Button>
        </form>

        {/* Toggle Login/Signup */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setErrors({ email: "", password: "" });
            }}
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
      </Card>
    </div>
  );
};

export default Auth;