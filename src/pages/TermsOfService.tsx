import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const TermsOfService = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border/50">
        <div className="container max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/settings/activity")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.common_back}
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <Card className="p-4 sm:p-6 md:p-8 bg-card border-border/50 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">{t.terms_title}</h1>
          </div>

          <div className="space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">{t.terms_section_1}</h2>
              <p>{t.terms_section_1_text}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">{t.terms_section_2}</h2>
              <p>{t.terms_section_2_text}</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                {t.terms_section_2_list.split(' • ').map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">{t.terms_section_3}</h2>
              <p>{t.terms_section_3_text}</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                {t.terms_section_3_list.split(' • ').map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">{t.terms_section_4}</h2>
              <p>{t.terms_section_4_text}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">{t.terms_section_5}</h2>
              <p>{t.terms_section_5_text}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">{t.terms_section_6}</h2>
              <p>{t.terms_section_6_text}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">{t.terms_section_7}</h2>
              <p>{t.terms_section_7_text}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">{t.terms_section_8}</h2>
              <p>{t.terms_section_8_text}</p>
            </section>

            <div className="pt-6 border-t border-border/50 text-sm">
              <p>{t.terms_last_updated}</p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default TermsOfService;
