import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { HelpCircle, MessageCircle, Mail, Book, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";

const HelpButton = () => {
  const [open, setOpen] = useState(false);

  const helpOptions = [
    {
      icon: Book,
      title: "Ghid de utilizare",
      description: "Învață cum să folosești platforma",
      action: () => window.scrollTo({ top: 0, behavior: "smooth" }),
      buttonText: "Vezi ghidul"
    },
    {
      icon: MessageCircle,
      title: "FAQ",
      description: "Răspunsuri la întrebările frecvente",
      action: () => {
        setOpen(false);
        setTimeout(() => {
          document.getElementById("faq-section")?.scrollIntoView({ behavior: "smooth" });
        }, 300);
      },
      buttonText: "Vezi FAQ"
    },
    {
      icon: Mail,
      title: "Contactează-ne",
      description: "Trimite-ne un email pentru suport",
      action: () => window.location.href = "mailto:support@confess.ai",
      buttonText: "Trimite email"
    }
  ];

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[var(--shadow-glow)] animate-bounce-subtle z-50"
        aria-label="Ajutor"
      >
        <HelpCircle className="w-6 h-6" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-primary" />
              Cum te putem ajuta?
            </DialogTitle>
            <DialogDescription>
              Alege una din opțiunile de mai jos pentru a primi ajutor
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {helpOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <Card
                  key={index}
                  className="p-4 bg-muted/30 border-border/50 hover:bg-muted/50 transition-all cursor-pointer group"
                  onClick={option.action}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                        {option.title}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {option.description}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        {option.buttonText}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="pt-4 border-t border-border/50 text-center">
            <p className="text-sm text-muted-foreground">
              Răspundem de obicei în maxim 24 de ore
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HelpButton;
