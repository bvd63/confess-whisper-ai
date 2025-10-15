import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const FAQ = () => {
  const { t } = useLanguage();
  
  const faqs = [
    { question: t.faq_q1, answer: t.faq_a1 },
    { question: t.faq_q2, answer: t.faq_a2 },
    { question: t.faq_q3, answer: t.faq_a3 },
    { question: t.faq_q4, answer: t.faq_a4 },
    { question: t.faq_q5, answer: t.faq_a5 },
    { question: t.faq_q6, answer: t.faq_a6 },
    { question: t.faq_q7, answer: t.faq_a7 },
    { question: t.faq_q8, answer: t.faq_a8 },
  ];

  return (
    <Card className="p-6 bg-card border-border/50 shadow-[var(--shadow-soft)] animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-full bg-primary/10">
          <HelpCircle className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">{t.faq_title}</h2>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {faqs.map((faq, index) => (
          <AccordionItem 
            key={index} 
            value={`item-${index}`}
            className="border border-border/50 rounded-lg px-4 bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <AccordionTrigger className="text-left hover:no-underline py-4">
              <span className="font-medium text-foreground">{faq.question}</span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Card>
  );
};

export default FAQ;
