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
      question: "Este cu adevărat anonim?",
      answer: "Da! Confesiunile tale sunt complet anonime. Numele tău nu apare niciodată public și nu poate fi asociat cu confesiunile tale de către alți utilizatori. Stocăm doar datele necesare pentru funcționarea platformei."
    },
    {
      question: "Cum funcționează AI-ul?",
      answer: "AI-ul nostru analizează confesiunea ta și generează un răspuns empatic și înțelegător. Folosim modele avansate de limbaj antrenate să fie empatice și non-judecătoare. Răspunsurile nu sunt pre-scrise, ci generate special pentru fiecare confesiune."
    },
    {
      question: "Ce este Deep Insight?",
      answer: "Deep Insight este o funcție premium care oferă o analiză psihologică mai profundă a confesiunii tale. Include perspective suplimentare, sfaturi practice și întrebări de reflecție pentru a te ajuta să înțelegi mai bine situația ta."
    },
    {
      question: "Pot să-mi șterg confesiunile?",
      answer: "Da, poți edita sau șterge confesiunile tale oricând din pagina de profil. Odată șterse, confesiunile sunt eliminate permanent din baza de date."
    },
    {
      question: "Ce face abonamentul Premium?",
      answer: "Abonamentul Premium îți oferă acces nelimitat la Deep Insights AI, răspunsuri mai detaliate, experiență fără reclame și prioritate în procesarea AI. De asemenea, susții dezvoltarea platformei!"
    },
    {
      question: "Cum funcționează programul de referral?",
      answer: "Primești un cod unic de referral pe care îl poți partaja cu prietenii. Când cineva se înregistrează folosind codul tău, amândoi primiți beneficii. Vezi detalii complete în pagina de profil."
    },
    {
      question: "Datele mele sunt sigure?",
      answer: "Da! Toate datele sunt criptate și stocate securizat. Folosim cele mai bune practici de securitate și respectăm GDPR. Nu vindem sau partajăm datele tale cu terțe părți."
    },
    {
      question: "Pot folosi platforma pentru consiliere profesională?",
      answer: "Nu. Confess.AI nu înlocuiește consilierea profesională. Dacă ai probleme grave de sănătate mintală, te rugăm să contactezi un specialist. Platforma noastră este pentru suport emoțional și reflecție personală."
    }
  ];

  return (
    <Card className="p-6 bg-card border-border/50 shadow-[var(--shadow-soft)] animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-full bg-primary/10">
          <HelpCircle className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Întrebări Frecvente</h2>
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
