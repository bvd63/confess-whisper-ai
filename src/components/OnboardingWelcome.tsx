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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              {t.onboarding_welcome_title || "Welcome to Your Safe Space"}
            </DialogTitle>
            <DialogDescription>
              {t.onboarding_welcome_desc || "A place where you can share your thoughts anonymously and connect with others"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {step === 1 && (
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-primary/10 rounded-lg">
                  <Shield className="w-12 h-12 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">{t.onboarding_privacy_title || "Your Privacy Matters"}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t.onboarding_privacy_desc || "We use end-to-end encryption and never share your data. Your confessions remain anonymous unless you choose otherwise."}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">
                    {t.onboarding_terms_desc || "By continuing, you agree to our Terms of Service and Privacy Policy. You can delete your data at any time from your profile settings."}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            {step === 1 ? (
              <Button onClick={() => setStep(2)} className="w-full">
                {t.common_continue || "Continue"}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep(1)}>
                  {t.common_back || "Back"}
                </Button>
                <Button onClick={handleComplete}>{t.get_started}</Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
