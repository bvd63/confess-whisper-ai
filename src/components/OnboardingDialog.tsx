import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/translated-dialog";
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
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onComplete(); }}>
      <DialogContent className="sm:max-w-md top-[55%] sm:top-[50%]">
        <DialogTitle className="sr-only">{currentStep.title}</DialogTitle>
        <DialogDescription className="sr-only">{currentStep.description}</DialogDescription>
        <div className="absolute top-4 right-16">
          <LanguageSelector />
        </div>
        <div className="py-8 sm:py-6 space-y-7 sm:space-y-6 text-center">
          {/* Icon */}
          <div className={`inline-flex items-center justify-center w-24 h-24 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br ${currentStep.gradient} animate-fade-in shadow-[0_0_20px_rgba(147,51,234,0.4)]`}>
            <Icon className="w-12 h-12 sm:w-10 sm:h-10 text-primary" />
          </div>

          {/* Content */}
          <div className="space-y-4 sm:space-y-3 animate-fade-in">
            <h2 className="text-2xl sm:text-2xl font-bold">{currentStep.title}</h2>
            <p className="text-muted-foreground px-4 text-base sm:text-sm font-medium">
              {currentStep.description}
            </p>
          </div>

          {/* Progress */}
          <div className="flex gap-2.5 justify-center pt-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2.5 rounded-full transition-all ${
                  i === step
                    ? "w-10 bg-primary shadow-[0_0_8px_rgba(147,51,234,0.5)]"
                    : "w-2.5 bg-muted/50"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6 sm:pt-4">
            {!isLastStep && (
              <Button
                onClick={onComplete}
                variant="ghost"
                className="flex-1 h-11 sm:h-10"
              >
                {t.skip}
              </Button>
            )}
            <Button
              onClick={handleNext}
              className={`${isLastStep ? 'flex-1' : 'flex-1'} h-11 sm:h-10 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2`}
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