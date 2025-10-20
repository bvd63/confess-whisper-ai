import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatedCard } from "@/components/AnimatedCard";
import { GradientText } from "@/components/GradientText";
import { EnhancedButton } from "@/components/EnhancedButton";
import { Heart, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

export default function EmailVerification() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Supabase handles email verification automatically via the magic link
        // The hash fragment contains the verification tokens
        const hashFragment = window.location.hash;
        
        if (hashFragment && hashFragment.includes('access_token=')) {
          // User clicked the verification link - tokens are in the URL
          // Supabase client will automatically handle this
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) throw error;
          
          if (session) {
            setStatus('success');
            // Redirect to home after 2 seconds
            setTimeout(() => {
              navigate('/');
            }, 2000);
          } else {
            setStatus('error');
          }
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Email verification error:', error);
        setStatus('error');
      }
    };

    verifyEmail();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-mesh flex items-center justify-center p-3 sm:p-4">
      <AnimatedCard
        hover="glow"
        glass
        className="w-full max-w-md p-4 sm:p-6 md:p-8 border-primary/20"
      >
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-3 sm:mb-4">
            <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-primary animate-heart-beat" fill="currentColor" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            <GradientText variant="hero">{t.auth_verify_email_title}</GradientText>
          </h1>
        </div>

        {/* Status Content */}
        <div className="space-y-6 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">{t.ui_loading}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 animate-bounce-in" />
              <div className="space-y-2">
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {t.auth_verify_email_success}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t.payment_redirecting}
                </p>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 mx-auto text-destructive" />
              <div className="space-y-4">
                <p className="text-lg font-semibold text-destructive">
                  {t.auth_verify_email_error}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t.auth_reset_token_expired}
                </p>
                <EnhancedButton
                  onClick={() => navigate('/auth')}
                  className="w-full"
                >
                  {t.auth_back_to_login}
                </EnhancedButton>
              </div>
            </>
          )}
        </div>
      </AnimatedCard>
    </div>
  );
}
