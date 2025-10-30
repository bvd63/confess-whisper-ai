import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/translated-dialog";
import { HelpCircle, MessageCircle, Mail, Book, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

const HelpButton = () => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const helpOptions = [
    {
      icon: Book,
      title: t.help_user_guide_title,
      description: t.help_user_guide_desc,
      action: () => window.scrollTo({ top: 0, behavior: "smooth" }),
      buttonText: t.help_view_guide
    },
    {
      icon: MessageCircle,
      title: t.help_faq_title,
      description: t.help_faq_desc,
      action: () => {
        setOpen(false);
        setTimeout(() => {
          document.getElementById("faq-section")?.scrollIntoView({ behavior: "smooth" });
        }, 300);
      },
      buttonText: t.help_view_faq
    },
    {
      icon: Mail,
      title: t.help_contact_title,
      description: t.help_contact_desc,
      action: () => window.location.href = "mailto:support@confess.ai",
      buttonText: t.help_send_email
    }
  ];

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[var(--shadow-glow)] animate-bounce-subtle z-50"
        aria-label={t.common_help_aria}
      >
        <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl md:text-2xl flex items-center gap-1.5 sm:gap-2">
              <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              {t.help_dialog_title}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t.help_dialog_desc}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 sm:space-y-3 py-3 sm:py-4">
            {helpOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <Card
                  key={index}
                  className="p-3 sm:p-4 bg-muted/30 border-border/50 hover:bg-muted/50 transition-all cursor-pointer group"
                  onClick={option.action}
                >
                  <div className="flex items-start gap-2.5 sm:gap-4">
                    <div className="p-1.5 sm:p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm sm:text-base font-semibold text-foreground mb-0.5 sm:mb-1 flex items-center gap-1.5 sm:gap-2">
                        {option.title}
                        <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                        {option.description}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[10px] sm:text-xs h-7 sm:h-8"
                      >
                        {option.buttonText}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="pt-3 sm:pt-4 border-t border-border/50 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t.help_response_time}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HelpButton;
