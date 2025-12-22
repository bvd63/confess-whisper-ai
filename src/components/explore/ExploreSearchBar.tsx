import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";

interface ExploreSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onDisabledClick?: () => void;
}

export const ExploreSearchBar = ({ value, onChange, disabled, onDisabledClick }: ExploreSearchBarProps) => {
  const { t } = useLanguage();

  return (
    <div className="relative" onMouseDown={disabled ? onDisabledClick : undefined}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
        <Search className="h-4 w-4 text-white/45 drop-shadow-[0_0_6px_rgba(255,255,255,0.12)]" />
      </div>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={disabled ? t.explore_search_placeholder_logged_out : t.explore_search_confessions_placeholder}
        disabled={disabled}
        className="pl-10 h-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 
          rounded-xl focus:border-primary/50 focus:ring-primary/20"
      />
    </div>
  );
};
