import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Shield } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

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
            {t.common_back}
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8">
        <Card className="p-8 bg-card border-border/50 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">{t.privacy_title}</h1>
          </div>

          <div className="space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">{t.privacy_section_1}</h2>
              <p>{t.privacy_section_1_text}</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                {t.privacy_section_1_list.split(' • ').map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">{t.privacy_section_2}</h2>
              <p>{t.privacy_section_2_text}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">{t.privacy_section_3}</h2>
              <p>{t.privacy_section_3_text}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">{t.privacy_section_4}</h2>
              <p>{t.privacy_section_4_text}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">{t.privacy_section_5}</h2>
              <p>{t.privacy_section_5_text}</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                {t.privacy_section_5_list.split(' • ').map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">{t.privacy_section_6}</h2>
              <p>{t.privacy_section_6_text}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">{t.privacy_section_7}</h2>
              <p>{t.privacy_section_7_text}</p>
            </section>

            <div className="pt-6 border-t border-border/50 text-sm">
              <p>{t.privacy_last_updated}</p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
