import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle } from "lucide-react";

const EndOfFeedState = () => {
  const { t } = useLanguage();

  return (
    <div className="py-8 mt-4">
      <div className="relative max-w-xs mx-auto">
        {/* Smaller glassmorphism card */}
        <div className="relative rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 text-center">
          {/* Subtle accent glow */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
          
          {/* Icon */}
          <div className="relative mb-3 flex justify-center">
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-primary/70 via-primary/60 to-accent/70 flex items-center justify-center shadow-lg shadow-primary/30">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-base font-medium text-white/80 mb-1">
            {t.index_end_of_feed_title}
          </h3>

          {/* Description */}
          <p className="text-xs text-white/45">
            {t.index_end_of_feed_desc}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EndOfFeedState;
