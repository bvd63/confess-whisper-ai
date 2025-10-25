import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdvancedFilters } from '@/components/AdvancedFilters';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: {
      filters_title: 'Filters',
      filters_date_range: 'Date Range',
      filters_from: 'From',
      filters_to: 'To',
      filters_community: 'Community',
      filters_all_communities: 'All Communities',
      filters_sort_by: 'Sort By',
      filters_newest: 'Newest',
      filters_oldest: 'Oldest',
      filters_most_liked: 'Most Liked',
      filters_trending: 'Trending',
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

  it('renders all filter sections', () => {
    render(<AdvancedFilters onFilterChange={mockOnFilterChange} />);

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Date Range')).toBeInTheDocument();
    expect(screen.getByText('Community')).toBeInTheDocument();
    expect(screen.getByText('Sort By')).toBeInTheDocument();
  });

  it('calls onFilterChange when sort option changes', async () => {
    render(<AdvancedFilters onFilterChange={mockOnFilterChange} />);

    const sortSelect = screen.getByRole('combobox');
    fireEvent.click(sortSelect);
    
    // Wait for dropdown to appear and select an option
    const oldestOption = await screen.findByText('Oldest');
    fireEvent.click(oldestOption);

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        sortBy: 'oldest',
      })
    );
  });

  it('updates date range filters', () => {
    render(<AdvancedFilters onFilterChange={mockOnFilterChange} />);

    const fromInput = screen.getByLabelText('From');
    fireEvent.change(fromInput, { target: { value: '2024-01-01' } });

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        dateFrom: '2024-01-01',
      })
    );
  });

  it('displays community options', async () => {
    render(<AdvancedFilters onFilterChange={mockOnFilterChange} />);

    const communitySelect = screen.getAllByRole('combobox')[1]; // Second combobox
    fireEvent.click(communitySelect);

    expect(await screen.findByText('All Communities')).toBeInTheDocument();
    expect(await screen.findByText('Community 1')).toBeInTheDocument();
    expect(await screen.findByText('Community 2')).toBeInTheDocument();
  });
});
