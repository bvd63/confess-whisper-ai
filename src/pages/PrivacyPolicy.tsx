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

      <main className="container max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-5 md:py-6">
        <Card className="p-4 sm:p-5 md:p-6 bg-card border-border/50 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
            <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{t.privacy_title}</h1>
          </div>

          <div className="space-y-4 sm:space-y-5 text-muted-foreground">
            <section>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground mb-2 sm:mb-3">{t.privacy_section_1}</h2>
              <p>{t.privacy_section_1_text}</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                {t.privacy_section_1_list.split(' • ').map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground mb-2 sm:mb-3">{t.privacy_section_2}</h2>
              <p>{t.privacy_section_2_text}</p>
            </section>

            <section>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground mb-2 sm:mb-3">{t.privacy_section_3}</h2>
              <p>{t.privacy_section_3_text}</p>
            </section>

            <section>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground mb-2 sm:mb-3">{t.privacy_section_4}</h2>
              <p>{t.privacy_section_4_text}</p>
            </section>

            <section>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground mb-2 sm:mb-3">{t.privacy_section_5}</h2>
              <p>{t.privacy_section_5_text}</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                {t.privacy_section_5_list.split(' • ').map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground mb-2 sm:mb-3">{t.privacy_section_6}</h2>
              <p>{t.privacy_section_6_text}</p>
            </section>

            <section>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground mb-2 sm:mb-3">{t.privacy_section_7}</h2>
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
