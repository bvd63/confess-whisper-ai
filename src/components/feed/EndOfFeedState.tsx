import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { CheckCircle, RefreshCw } from "lucide-react";

interface EndOfFeedStateProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
}

const EndOfFeedState = ({ onRefresh, isRefreshing }: EndOfFeedStateProps) => {
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
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-primary/15 to-accent/15 border border-white/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-primary/80" />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-base font-medium text-white/80 mb-1">
            {t.index_end_of_feed_title}
          </h3>

          {/* Description */}
          <p className="text-xs text-white/45 mb-4">
            {t.index_end_of_feed_desc}
          </p>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-xs text-white/60 hover:text-white/80 hover:bg-white/5 gap-1.5 px-3 py-1.5 h-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t.index_end_of_feed_refresh}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EndOfFeedState;
