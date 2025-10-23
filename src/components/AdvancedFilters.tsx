import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AdvancedFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  communities?: Array<{ id: string; name: string }>;
}

export interface FilterState {
  dateFrom?: Date;
  dateTo?: Date;
  communityId?: string;
  sortBy: 'newest' | 'oldest' | 'most_liked' | 'most_commented';
}

export const AdvancedFilters = ({ onFilterChange, communities = [] }: AdvancedFiltersProps) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    sortBy: 'newest',
  });

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFilterChange(updated);
  };

  const clearFilters = () => {
    const cleared: FilterState = { sortBy: 'newest' };
    setFilters(cleared);
    onFilterChange(cleared);
  };

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.communityId;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <div className="flex items-center justify-between p-3 border rounded-lg bg-background/50">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            {t.filters_title}
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-3 w-3" />
            {t.filters_clear}
          </Button>
        )}
      </div>

      <CollapsibleContent className="space-y-3 p-3 border border-t-0 rounded-b-lg bg-background/30">
        {/* Date Range */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t.filters_date}</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal" data-testid="date-from-button">
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {filters.dateFrom ? format(filters.dateFrom, 'PP') : 'From'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateFrom}
                  onSelect={(date) => updateFilters({ dateFrom: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">&nbsp;</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal" data-testid="date-to-button">
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {filters.dateTo ? format(filters.dateTo, 'PP') : 'To'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateTo}
                  onSelect={(date) => updateFilters({ dateTo: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Community Filter */}
        {communities.length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t.filters_community}</label>
            <Select
              value={filters.communityId || 'all'}
              onValueChange={(value) => updateFilters({ communityId: value === 'all' ? undefined : value })}
            >
              <SelectTrigger className="h-9" data-testid="community-select">
                <SelectValue placeholder={t.communities_filter_all} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.communities_filter_all}</SelectItem>
                {communities.map((community) => (
                  <SelectItem key={community.id} value={community.id}>
                    {community.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Sort By */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t.filters_sort}</label>
          <Select
            value={filters.sortBy}
            onValueChange={(value) => updateFilters({ sortBy: value as FilterState['sortBy'] })}
          >
            <SelectTrigger className="h-9" data-testid="sort-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t.sort_newest}</SelectItem>
              <SelectItem value="oldest">{t.sort_oldest}</SelectItem>
              <SelectItem value="most_liked">{t.sort_most_liked}</SelectItem>
              <SelectItem value="most_commented">{t.sort_most_commented}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
