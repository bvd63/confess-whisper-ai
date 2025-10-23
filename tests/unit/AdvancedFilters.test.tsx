import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdvancedFilters } from '@/components/AdvancedFilters';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: {
      filters_title: 'Filters',
      filters_date: 'Date Range',
      filters_from: 'From',
      filters_to: 'To',
      filters_community: 'Community',
      filters_sort: 'Sort By',
      filters_clear: 'Clear',
      communities_filter_all: 'All Communities',
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
  const mockCommunities = [
    { id: '1', name: 'Community 1' },
    { id: '2', name: 'Community 2' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all filter sections', () => {
    render(<AdvancedFilters onFilterChange={mockOnFilterChange} />);

    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('opens collapsible when filter button is clicked', () => {
    render(<AdvancedFilters onFilterChange={mockOnFilterChange} />);

    const filterButton = screen.getByText('Filters');
    fireEvent.click(filterButton);

    // After opening, elements should be visible
    expect(screen.getByText('Date Range')).toBeInTheDocument();
    expect(screen.getByText('Sort By')).toBeInTheDocument();
  });

  it('renders date range buttons', () => {
    render(<AdvancedFilters onFilterChange={mockOnFilterChange} />);

    // Open the collapsible first
    const filterButton = screen.getByText('Filters');
    fireEvent.click(filterButton);

    const fromButton = screen.getByTestId('date-from-button');
    const toButton = screen.getByTestId('date-to-button');

    expect(fromButton).toBeInTheDocument();
    expect(toButton).toBeInTheDocument();
  });

  it('renders community select when communities provided', () => {
    render(<AdvancedFilters onFilterChange={mockOnFilterChange} communities={mockCommunities} />);

    // Open the collapsible first
    const filterButton = screen.getByText('Filters');
    fireEvent.click(filterButton);

    const communitySelect = screen.getByTestId('community-select');
    expect(communitySelect).toBeInTheDocument();
  });
});
