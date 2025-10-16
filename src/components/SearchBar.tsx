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
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t.search_placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 pr-10"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <Button onClick={handleSearch}>
          <Search className="w-4 h-4 mr-2" />
          {t.search_button}
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t.search_category_label}</Label>
                <Select
                  value={filters.category || 'all'}
                  onValueChange={(value) =>
                    setFilters({ ...filters, category: value === 'all' ? undefined : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={handleClear} className="h-8">
          <X className="w-3 h-3 mr-1" />
          {t.search_clear_filters}
        </Button>
      )}
    </div>
  );
};

export default SearchBar;
