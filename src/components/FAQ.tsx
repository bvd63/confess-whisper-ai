import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";

const FAQ = () => {
  const faqs = [
    {
      question: "Is it really anonymous?",
      answer: "Yes! Your confessions are completely anonymous. Your name never appears publicly and can't be linked to your confessions by other users. We only store the data necessary for the platform to function."
    },
    {
      question: "How does the AI work?",
      answer: "Our AI analyzes your confession and generates an empathetic, understanding response. We use advanced language models trained to be empathic and non-judgmental. Responses aren't pre-written; they’re generated uniquely for each confession."
    },
    {
      question: "What is Deep Insight?",
      answer: "Deep Insight is a premium feature that provides deeper psychological analysis of your confession. It includes extra perspectives, practical advice, and reflective questions to help you better understand your situation."
    },
    {
      question: "Can I delete my confessions?",
      answer: "Yes, you can edit or delete your confessions anytime from the profile page. Once deleted, they are permanently removed from the database."
    },
    {
      question: "What does the Premium subscription offer?",
      answer: "Premium gives you unlimited AI Deep Insights, more detailed responses, an ad-free experience, and priority AI processing. You also support the development of the platform!"
    },
    {
      question: "How does the referral program work?",
      answer: "You get a unique referral code you can share with friends. When someone signs up using your code, both of you get benefits. See full details on the profile page."
    },
    {
      question: "Is my data secure?",
      answer: "Yes! All data is encrypted and stored securely. We use best-in-class security practices and comply with GDPR. We do not sell or share your data with third parties."
    },
    {
      question: "Can I use the platform for professional counseling?",
      answer: "No. Confess+ does not replace professional counseling. If you’re facing serious mental health issues, please contact a specialist. Our platform is for emotional support and personal reflection."
    }
  ];

  return (
    <Card className="p-6 bg-card border-border/50 shadow-[var(--shadow-soft)] animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-full bg-primary/10">
          <HelpCircle className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
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
