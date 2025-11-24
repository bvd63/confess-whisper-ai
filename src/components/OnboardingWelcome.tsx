import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Shield, Users, MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface OnboardingWelcomeProps {
  userId: string;
  onComplete?: () => void;
}

export const OnboardingWelcome = ({ userId, onComplete }: OnboardingWelcomeProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const { t } = useLanguage();

  useEffect(() => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem(`onboarding_${userId}`);
    if (!hasSeenOnboarding) {
      setOpen(true);
    }
  }, [userId]);

  const handleComplete = () => {
    localStorage.setItem(`onboarding_${userId}`, "true");
    setOpen(false);
    onComplete?.();
  };

  const features = [
    {
      icon: Shield,
      title: "🛡️ " + t.anonymous_secure,
      description: t.onboarding_anonymous_desc || "Your identity is protected. Share freely without fear.",
    },
    {
      icon: Users,
      title: "👥 " + (t.onboarding_social_title || "Social Features"),
      description: t.onboarding_social_desc || "Follow users, like confessions, and build your community.",
    },
    {
      icon: MessageCircle,
      title: "💬 " + (t.onboarding_messages_title || "Direct Messages"),
      description: t.onboarding_messages_desc || "Connect privately with others in the community.",
    },
    {
      icon: Sparkles,
      title: "⭐ " + (t.onboarding_ai_title || "AI Insights"),
      description: t.onboarding_ai_desc || "Get thoughtful AI responses to your confessions.",
    },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md top-[55%] sm:top-[50%] mx-4 sm:mx-auto bg-background border-border">
          <DialogHeader className="space-y-4">
            <div className="mx-auto mb-2 relative">
              <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full animate-pulse-glow" />
              <div className="relative bg-primary/10 p-5 rounded-full">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-3xl text-center font-bold text-foreground">
              ❤️ {t.onboarding_welcome_title || "Welcome to Your Safe Space"}
            </DialogTitle>
            <DialogDescription className="text-base font-medium text-muted-foreground text-center">
              {t.onboarding_welcome_desc || "A place where you can share your thoughts anonymously and connect with others"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-5 sm:py-4">
            {step === 1 && (
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex gap-4 items-start p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all">
                    <div className="p-3 bg-primary/10 rounded-full shadow-sm flex-shrink-0">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-base text-foreground mb-1">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 text-center">
                <div className="p-6 bg-card rounded-xl border border-border">
                  <div className="relative inline-block mb-4">
                    <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full" />
                    <Shield className="w-16 h-16 text-primary mx-auto relative z-10" />
                  </div>
                  <h3 className="font-bold mb-3 text-lg text-foreground">🔒 {t.onboarding_privacy_title || "Your Privacy Matters"}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t.onboarding_privacy_desc || "We use end-to-end encryption and never share your data. Your confessions remain anonymous unless you choose otherwise."}
                  </p>
                </div>
                <div className="p-5 bg-card rounded-xl border border-border">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    📋 {t.onboarding_terms_desc || "By continuing, you agree to our Terms of Service and Privacy Policy. You can delete your data at any time from your profile settings."}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between gap-4 pt-2">
            {step === 1 ? (
              <Button onClick={() => setStep(2)} className="w-full h-12 sm:h-11 font-semibold bg-primary hover:bg-primary/90 shadow-lg">
                {t.common_continue || "Continue"} →
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 sm:h-11 font-semibold border-2">
                  ← {t.common_back || "Back"}
                </Button>
                <Button onClick={handleComplete} className="flex-1 h-12 sm:h-11 font-semibold bg-primary hover:bg-primary/90 shadow-lg">
                  🚀 {t.get_started}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
