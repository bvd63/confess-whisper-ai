import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";

interface ExploreSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const ExploreSearchBar = ({ value, onChange }: ExploreSearchBarProps) => {
  const { t } = useLanguage();

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.explore_search_confessions_placeholder}
        className="pl-10 h-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 
          rounded-xl focus:border-primary/50 focus:ring-primary/20"
      />
    </div>
  );
};
