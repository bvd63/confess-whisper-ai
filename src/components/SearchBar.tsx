import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Search, SlidersHorizontal, Clock, TrendingUp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";

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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'recent',
    timeRange: 'all',
  });
  const { recentSearches, trendingSearches, addRecentSearch, clearRecentSearches } = useSearchSuggestions();
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim()) {
      addRecentSearch(finalQuery.trim());
    }
    onSearch(finalQuery, filters);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const showSuggestionsDropdown = showSuggestions && (recentSearches.length > 0 || trendingSearches.length > 0);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {/* Single Search Input - Press Enter or Icon to search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            placeholder={t.search_placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            className="pl-12 pr-12 h-12 text-base rounded-xl shadow-ios"
            aria-label={t.search_button}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full p-1 hover:bg-accent/50 transition-all"
              aria-label={t.search_clear_filters}
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Search Suggestions Dropdown */}
          {showSuggestionsDropdown && (
            <div 
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border/50 rounded-2xl shadow-elevated z-50 max-h-80 overflow-y-auto backdrop-blur-xl"
            >
              {recentSearches.length > 0 && (
                <div className="p-3 border-b border-border/50">
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{t.search_recent}</span>
                    </div>
                    <button
                      onClick={clearRecentSearches}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t.search_clear}
                    </button>
                  </div>
                  {recentSearches.map((search, idx) => (
                    <button
                      key={`recent-${idx}`}
                      onClick={() => handleSuggestionClick(search)}
                      className="w-full text-left px-4 py-3 hover:bg-accent rounded-xl text-base transition-colors"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              )}
              {trendingSearches.length > 0 && (
                <div className="p-3">
                  <div className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span>{t.search_trending}</span>
                  </div>
                  {trendingSearches.map((search, idx) => (
                    <button
                      key={`trending-${idx}`}
                      onClick={() => handleSuggestionClick(search)}
                      className="w-full text-left px-4 py-3 hover:bg-accent rounded-xl text-base transition-colors"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Single Filter Button */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-xl shadow-ios"
              aria-label={t.search_sort_label}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 sm:w-96" align="end">
            <div className="space-y-4">
              {/* Category Filter */}
              <div className="space-y-2">
                <Label className="text-base">{t.search_category_label}</Label>
                <Select
                  value={filters.category || 'all'}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      category: value === 'all' ? undefined : value,
                    }))
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

              {/* Sort By */}
              <div className="space-y-2">
                <Label className="text-base">{t.search_sort_label}</Label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value: any) =>
                    setFilters((prev) => ({ ...prev, sortBy: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                <Label className="text-base">{t.search_period_label}</Label>
                <Select
                  value={filters.timeRange || 'all'}
                  onValueChange={(value: any) =>
                    setFilters((prev) => ({
                      ...prev,
                      timeRange: value === 'all' ? undefined : value,
                    }))
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

              {/* Single Clear Button - Inside Filter Menu */}
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="w-full h-12 text-base rounded-xl"
                >
                  <X className="w-5 h-5 mr-2" />
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
