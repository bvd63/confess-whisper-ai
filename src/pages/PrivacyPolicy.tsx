import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Shield } from "lucide-react";

const PrivacyPolicy = () => {
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
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Politica de Confidențialitate</h1>
          </div>

          <div className="space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Colectarea Datelor</h2>
              <p>Confess.AI colectează doar datele strict necesare pentru funcționarea platformei:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Adresa de email (pentru autentificare)</li>
                <li>Confesiunile tale (stocate anonim)</li>
                <li>Statistici de utilizare (pentru îmbunătățirea serviciului)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Anonimitate</h2>
              <p>Confesiunile tale sunt complet anonime. Numele tău nu apare niciodată public și nu poate fi asociat cu confesiunile tale de către alți utilizatori.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Utilizarea AI</h2>
              <p>Confesiunile tale sunt procesate de modele AI pentru a genera răspunsuri empatice. Aceste date nu sunt folosite pentru antrenarea modelelor și rămân confidențiale.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Securitatea Datelor</h2>
              <p>Toate datele sunt criptate și stocate securizat. Folosim cele mai bune practici de securitate pentru a-ți proteja informațiile.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Drepturile Tale</h2>
              <p>Ai dreptul să:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Accesezi datele tale personale</li>
                <li>Ștergi contul și toate datele asociate</li>
                <li>Soliciți exportul datelor tale</li>
                <li>Retragi consimțământul pentru procesarea datelor</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Cookie-uri</h2>
              <p>Folosim doar cookie-uri esențiale pentru funcționarea platformei (autentificare și preferințe). Nu folosim cookie-uri de tracking sau publicitate.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Contact</h2>
              <p>Pentru orice întrebări despre confidențialitate, ne poți contacta la: privacy@confess.ai</p>
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

export default PrivacyPolicy;
