import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border/50">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Înapoi
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8">
        <Card className="p-8 bg-card border-border/50 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Termeni și Condiții</h1>
          </div>

          <div className="space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptarea Termenilor</h2>
              <p>Prin utilizarea Confess.AI, ești de acord cu acești termeni și condiții. Dacă nu ești de acord, te rugăm să nu folosești platforma.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Utilizarea Serviciului</h2>
              <p>Confess.AI este o platformă pentru partajarea anonimă de gânduri și primirea de răspunsuri empatice de la AI. Te angajezi să:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Folosești platforma în mod responsabil</li>
                <li>Nu postezi conținut ilegal, ofensator sau dăunător</li>
                <li>Respecți regulile comunității</li>
                <li>Nu încerci să identifici alți utilizatori</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Conținut</h2>
              <p>Ești responsabil pentru conținutul pe care îl postezi. Ne rezervăm dreptul de a modera și șterge conținut care:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Încalcă legile aplicabile</li>
                <li>Este amenințător sau hărțuitor</li>
                <li>Conține informații false sau înșelătoare</li>
                <li>Încalcă drepturile altora</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Premium și Plăți</h2>
              <p>Abonamentul Premium oferă funcții suplimentare. Plățile sunt procesate securizat prin Stripe. Poți anula oricând abonamentul din setările contului.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Limitarea Răspunderii</h2>
              <p>Confess.AI nu oferă servicii de consiliere profesională. Răspunsurile AI sunt generate automat și nu înlocuiesc ajutorul profesional. Pentru probleme grave de sănătate mintală, te rugăm să contactezi un specialist.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Modificări ale Termenilor</h2>
              <p>Ne rezervăm dreptul de a modifica acești termeni. Modificările vor fi comunicate prin platformă și prin email.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Legea Aplicabilă</h2>
              <p>Acești termeni sunt guvernați de legile din România. Orice dispută va fi soluționată în instanțele competente din București.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Contact</h2>
              <p>Pentru întrebări despre termeni și condiții: legal@confess.ai</p>
            </section>

            <div className="pt-6 border-t border-border/50 text-sm">
              <p>Ultima actualizare: Octombrie 2025</p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default TermsOfService;
