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
      title: t.anonymous_secure,
      description: t.onboarding_anonymous_desc || "Your identity is protected. Share freely without fear.",
    },
    {
      icon: Users,
      title: t.onboarding_social_title || "Social Features",
      description: t.onboarding_social_desc || "Follow users, like confessions, and build your community.",
    },
    {
      icon: MessageCircle,
      title: t.onboarding_messages_title || "Direct Messages",
      description: t.onboarding_messages_desc || "Connect privately with others in the community.",
    },
    {
      icon: Sparkles,
      title: t.onboarding_ai_title || "AI Insights",
      description: t.onboarding_ai_desc || "Get thoughtful AI responses to your confessions.",
    },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md top-[55%] sm:top-[50%] mx-4 sm:mx-auto">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl flex items-center justify-center gap-2">
              <Sparkles className="w-7 h-7 text-primary shadow-[0_0_12px_rgba(147,51,234,0.5)]" />
              {t.onboarding_welcome_title || "Welcome to Your Safe Space"}
            </DialogTitle>
            <DialogDescription className="text-base font-medium">
              {t.onboarding_welcome_desc || "A place where you can share your thoughts anonymously and connect with others"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-5 sm:py-4">
            {step === 1 && (
              <div className="space-y-5 sm:space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="p-2.5 bg-primary/10 rounded-lg shadow-sm">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5 sm:space-y-4 text-center">
                <div className="p-5 sm:p-4 bg-primary/10 rounded-lg">
                  <Shield className="w-14 h-14 sm:w-12 sm:h-12 text-primary mx-auto mb-4 sm:mb-3 drop-shadow-[0_0_10px_rgba(147,51,234,0.4)]" />
                  <h3 className="font-semibold mb-2 text-base">{t.onboarding_privacy_title || "Your Privacy Matters"}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t.onboarding_privacy_desc || "We use end-to-end encryption and never share your data. Your confessions remain anonymous unless you choose otherwise."}
                  </p>
                </div>
                <div className="p-5 sm:p-4 bg-muted rounded-lg">
                  <p className="text-sm">
                    {t.onboarding_terms_desc || "By continuing, you agree to our Terms of Service and Privacy Policy. You can delete your data at any time from your profile settings."}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between gap-3 pt-2">
            {step === 1 ? (
              <Button onClick={() => setStep(2)} className="w-full h-11 sm:h-10">
                {t.common_continue || "Continue"}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-11 sm:h-10">
                  {t.common_back || "Back"}
                </Button>
                <Button onClick={handleComplete} className="flex-1 h-11 sm:h-10">{t.get_started}</Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
