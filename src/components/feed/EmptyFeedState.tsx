import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface EmptyFeedStateProps {
  onCreateConfession: () => void;
}

const EmptyFeedState = ({ onCreateConfession }: EmptyFeedStateProps) => {
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-center py-16">
      <div className="relative max-w-sm w-full mx-auto">
        {/* Glassmorphism card */}
        <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center shadow-2xl">
          {/* Subtle accent glow */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
          
          {/* Icon with glow */}
          <div className="relative mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/40 to-accent/40 blur-xl scale-150" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-white/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
            </div>
          </div>

          {/* Title with gradient underline */}
          <div className="relative mb-3">
            <h2 className="text-xl font-semibold text-white/90">
              {t.index_no_confessions_title}
            </h2>
            <div className="mx-auto mt-2 h-0.5 w-16 rounded-full bg-gradient-to-r from-primary to-accent opacity-60" />
          </div>

          {/* Description */}
          <p className="text-sm text-white/50 mb-6">
            {t.index_no_confessions_desc}
          </p>

          {/* CTA Button with accent gradient */}
          <Button
            onClick={onCreateConfession}
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-medium px-6 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-primary/20"
          >
            {t.index_empty_feed_cta}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmptyFeedState;
