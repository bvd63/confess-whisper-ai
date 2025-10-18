import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Search, SlidersHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";

// ✅ SINGLE-INSTANCE - Removed second button, kept icon + enter
interface SearchBarProps {
  onSearch: (query: string, filters: SearchFilters) => void;
}

export interface SearchFilters {
  category?: string;
  sortBy: 'recent' | 'popular' | 'trending';
  timeRange?: 'today' | 'week' | 'month' | 'all';
}

const SearchBar = ({ onSearch }: SearchBarProps) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'recent',
    timeRange: 'all',
  });

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

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex gap-2">
        {/* Single Search Input - Press Enter or Icon to search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t.search_placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            className="pl-10 pr-10 h-10 text-sm"
            aria-label={t.search_button}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
              aria-label={t.search_clear_filters}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Single Filter Button */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              aria-label={t.search_sort_label}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 sm:w-96" align="end">
            <div className="space-y-4">
              {/* Category Filter */}
              <div className="space-y-2">
                <Label>{t.search_category_label}</Label>
                <Select
                  value={filters.category || 'all'}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      category: value === 'all' ? undefined : value,
                    }))
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div className="space-y-2">
                <Label>{t.search_sort_label}</Label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value: any) =>
                    setFilters((prev) => ({ ...prev, sortBy: value }))
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Time Range */}
              <div className="space-y-2">
                <Label>{t.search_period_label}</Label>
                <Select
                  value={filters.timeRange || 'all'}
                  onValueChange={(value: any) =>
                    setFilters((prev) => ({
                      ...prev,
                      timeRange: value === 'all' ? undefined : value,
                    }))
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {timeRanges.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Single Clear Button - Inside Filter Menu */}
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="w-full h-10 text-sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  {t.search_clear_filters}
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default SearchBar;
