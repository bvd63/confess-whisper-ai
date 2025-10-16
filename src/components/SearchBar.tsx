import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";

interface SearchBarProps {
  onSearch: (query: string, filters: SearchFilters) => void;
}

export interface SearchFilters {
  category?: string;
  sortBy: 'recent' | 'popular' | 'trending';
  timeRange?: 'today' | 'week' | 'month' | 'all';
}

const SearchBar = ({ onSearch }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'recent',
    timeRange: 'all',
  });
  const { t } = useLanguage();

  const categories = [
    { value: 'all', label: t.search_all_categories },
    { value: 'relationships', label: t.category_relationships },
    { value: 'work', label: t.category_work },
    { value: 'family', label: t.category_family },
    { value: 'health', label: t.category_health },
    { value: 'money', label: t.category_money },
    { value: 'other', label: t.category_other },
  ];

  const timeRanges = [
    { value: 'all', label: t.search_anytime },
    { value: 'today', label: t.search_today },
    { value: 'week', label: t.search_this_week },
    { value: 'month', label: t.search_this_month },
  ];

  const sortOptions = [
    { value: 'recent', label: t.search_most_recent },
    { value: 'popular', label: t.search_most_popular },
    { value: 'trending', label: t.search_trending },
  ];

  const handleSearch = () => {
    onSearch(query, filters);
  };

  const handleClear = () => {
    setQuery("");
    setFilters({
      sortBy: 'recent',
      timeRange: 'all',
    });
    onSearch("", {
      sortBy: 'recent',
      timeRange: 'all',
    });
  };

  const hasFilters = query || filters.category || filters.timeRange !== 'all';

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t.search_placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-8 sm:pl-10 pr-8 sm:pr-10 h-9 sm:h-10 text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSearch} className="flex-1 sm:flex-initial h-9 sm:h-10" size="sm">
            <Search className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">{t.search_button}</span>
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 max-w-md" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                <Label>{t.search_category_label}</Label>
                <Select
                  value={filters.category || 'all'}
                  onValueChange={(value) =>
                    setFilters({ ...filters, category: value === 'all' ? undefined : value })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-background">
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t.search_sort_label}</Label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value: any) => setFilters({ ...filters, sortBy: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-background">
                    {sortOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t.search_period_label}</Label>
                <Select
                  value={filters.timeRange || 'all'}
                  onValueChange={(value: any) =>
                    setFilters({ ...filters, timeRange: value === 'all' ? undefined : value })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-background">
                    {timeRanges.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 sm:h-8 text-xs sm:text-sm">
          <X className="w-3 h-3 mr-1" />
          {t.search_clear_filters}
        </Button>
      )}
    </div>
  );
};

export default SearchBar;
