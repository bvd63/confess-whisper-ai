import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
const FAQ = () => {
  const {
    t
  } = useLanguage();
  const faqs = [{
    question: t.faq_q1,
    answer: t.faq_a1
  }, {
    question: t.faq_q2,
    answer: t.faq_a2
  }, {
    question: t.faq_q3,
    answer: t.faq_a3
  }, {
    question: t.faq_q4,
    answer: t.faq_a4
  }, {
    question: t.faq_q5,
    answer: t.faq_a5
  }, {
    question: t.faq_q6,
    answer: t.faq_a6
  }, {
    question: t.faq_q7,
    answer: t.faq_a7
  }, {
    question: t.faq_q8,
    answer: t.faq_a8
  }];
  return <Card className="p-3 sm:p-4 bg-card border-border/50 shadow-[var(--shadow-soft)] animate-fade-in">
      <div className="flex items-center gap-2 sm:gap-2.5 mb-4 sm:mb-5">
        <div className="p-1.5 sm:p-2 rounded-full bg-primary/10">
          <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold">{t.faq_title}</h2>
      </div>

      <Accordion type="single" collapsible className="space-y-1.5 sm:space-y-2">
        {faqs.map((faq, index) => <AccordionItem key={index} value={`item-${index}`} className="border border-border/50 rounded-lg px-3 sm:px-4 bg-muted/30 hover:bg-muted/50 transition-colors">
            <AccordionTrigger className="text-left hover:no-underline py-2.5 sm:py-3">
              <span className="font-medium text-sm sm:text-base text-foreground">{faq.question}</span>
            </AccordionTrigger>
            <AccordionContent className="text-xs sm:text-sm text-muted-foreground pb-2.5 sm:pb-3 leading-relaxed">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>)}
      </Accordion>
    </Card>;
};
export default FAQ;