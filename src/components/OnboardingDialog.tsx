import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, Shield, Sparkles, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";

interface OnboardingDialogProps {
  open: boolean;
  onComplete: () => void;
}

const OnboardingDialog = ({ open, onComplete }: OnboardingDialogProps) => {
  const [step, setStep] = useState(0);
  const { t } = useLanguage();

  const steps = [
    {
      icon: Heart,
      title: t.welcome_title,
      description: t.welcome_description,
      gradient: "from-primary/20 to-primary/10",
    },
    {
      icon: Shield,
      title: t.anonymous_secure,
      description: t.anonymous_description,
      gradient: "from-blue-500/20 to-blue-500/10",
    },
    {
      icon: Sparkles,
      title: t.ai_support,
      description: t.ai_description,
      gradient: "from-purple-500/20 to-purple-500/10",
    },
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;
  const isLastStep = step === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>
        <div className="py-6 space-y-6 text-center">
          {/* Icon */}
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br ${currentStep.gradient} animate-fade-in`}>
            <Icon className="w-10 h-10 text-primary" />
          </div>

          {/* Content */}
          <div className="space-y-3 animate-fade-in">
            <h2 className="text-2xl font-bold">{currentStep.title}</h2>
            <p className="text-muted-foreground px-4">
              {currentStep.description}
            </p>
          </div>

          {/* Progress */}
          <div className="flex gap-2 justify-center">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === step
                    ? "w-8 bg-primary"
                    : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {!isLastStep && (
              <Button
                onClick={onComplete}
                variant="ghost"
                className="flex-1"
              >
                {t.skip}
              </Button>
            )}
            <Button
              onClick={handleNext}
              className={`${isLastStep ? 'flex-1' : 'flex-1'} bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2`}
            >
              {isLastStep ? t.get_started : t.next}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingDialog;