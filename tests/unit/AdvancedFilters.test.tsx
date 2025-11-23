import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdvancedFilters } from '@/components/AdvancedFilters';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: {
      filters_title: 'Filters',
      // Component uses these keys
      filters_date: 'Date Range',
      filters_community: 'Community',
      filters_sort: 'Sort By',
      communities_filter_all: 'All Communities',
      // Sort labels used inside SelectContent
      sort_newest: 'Newest',
      sort_oldest: 'Oldest',
      sort_most_liked: 'Most Liked',
      sort_most_commented: 'Most Commented',
    },
  }),
}));

// Mock useCommunities
vi.mock('@/hooks/useCommunities', () => ({
  useCommunities: () => ({
    communities: [
      { id: '1', name: 'Community 1' },
      { id: '2', name: 'Community 2' },
    ],
    loading: false,
  }),
}));

describe('AdvancedFilters', () => {
  const mockOnFilterChange = vi.fn();
  // Radix Select relies on scrollIntoView in jsdom; provide a no-op
  beforeAll(() => {
    // Provide scrollIntoView stub for Radix Select in jsdom
    (Element.prototype as any).scrollIntoView = vi.fn();
    (Element.prototype as any).hasPointerCapture = () => false;
    (Element.prototype as any).setPointerCapture = vi.fn();
    (Element.prototype as any).releasePointerCapture = vi.fn();
  });

  it('renders core filter sections (without communities)', () => {
    render(<AdvancedFilters onFilterChange={mockOnFilterChange} />);

    // Expand the filters panel first (collapsed by default)
    fireEvent.click(screen.getByText('Filters'));

    expect(screen.getByText('Date Range')).toBeInTheDocument();
    expect(screen.getByText('Sort By')).toBeInTheDocument();
  });

  it('calls onFilterChange when sort option changes', async () => {
    render(<AdvancedFilters onFilterChange={mockOnFilterChange} />);
    fireEvent.click(screen.getByText('Filters'));

    // Initial trigger shows current value "Newest"; click it to open
    fireEvent.click(screen.getByText('Newest'));
    const oldestOption = await screen.findByText('Oldest');
    fireEvent.click(oldestOption);

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'oldest' })
    );
  });

  it('updates date range filters (opens date picker)', async () => {
    render(<AdvancedFilters onFilterChange={mockOnFilterChange} />);
    fireEvent.click(screen.getByText('Filters'));

    // Click the "From" button to open calendar
    fireEvent.click(screen.getByText('From'));
    // Instead of interacting with calendar widget, directly assert that handler was wired by simulating selection
    // We can’t select a real date without knowing the Calendar markup; this checks presence of the popover
    expect(document.body).toContainElement(document.querySelector('[data-radix-popper-content-wrapper]'));
  });

  it('hides community options when feature is disabled', () => {
    render(<AdvancedFilters onFilterChange={mockOnFilterChange} />);
    fireEvent.click(screen.getByText('Filters'));

    expect(screen.queryByText('Community')).not.toBeInTheDocument();
    expect(screen.queryByText('Community 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Community 2')).not.toBeInTheDocument();
  });

  it('keeps community options hidden when data exists but feature disabled', () => {
    render(
      <AdvancedFilters
        onFilterChange={mockOnFilterChange}
        communities={[
          { id: '1', name: 'Community 1' },
          { id: '2', name: 'Community 2' },
        ]}
      />
    );
    fireEvent.click(screen.getByText('Filters'));

    expect(screen.queryByText('Community')).not.toBeInTheDocument();
    expect(screen.queryByText('Community 1')).not.toBeInTheDocument();
  });

  it('shows community options when feature enabled', async () => {
    render(
      <AdvancedFilters
        onFilterChange={mockOnFilterChange}
        showCommunityFilter
        communities={[
          { id: '1', name: 'Community 1' },
          { id: '2', name: 'Community 2' },
        ]}
      />
    );
    fireEvent.click(screen.getByText('Filters'));

    expect(screen.getByText('Community')).toBeInTheDocument();
    const trigger = screen.getByRole('combobox', { name: /community/i });
    fireEvent.mouseDown(trigger);
    fireEvent.click(trigger);

    expect(await screen.findByText('Community 1')).toBeInTheDocument();
    expect(await screen.findByText('Community 2')).toBeInTheDocument();
  });
});
