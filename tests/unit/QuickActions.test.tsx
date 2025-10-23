import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickActions } from '@/components/QuickActions';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: {
      confession_new: 'New Confession',
      drafts: 'Drafts',
      scroll_top: 'Scroll to Top',
    },
  }),
}));

describe('QuickActions', () => {
  const mockOnNewConfession = vi.fn();
  const mockOnOpenDrafts = vi.fn();
  const mockOnScrollToTop = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main FAB button', () => {
    render(
      <QuickActions
        onNewConfession={mockOnNewConfession}
        onOpenDrafts={mockOnOpenDrafts}
        onScrollToTop={mockOnScrollToTop}
      />
    );

    const fabButton = screen.getByLabelText('Scroll to Top');
    expect(fabButton).toBeInTheDocument();
  });

  it('expands to show all action buttons when clicked', () => {
    render(
      <QuickActions
        onNewConfession={mockOnNewConfession}
        onOpenDrafts={mockOnOpenDrafts}
        onScrollToTop={mockOnScrollToTop}
      />
    );

    const fabButton = screen.getByLabelText('Scroll to Top');
    fireEvent.click(fabButton);

    expect(screen.getByLabelText('New Confession')).toBeInTheDocument();
    expect(screen.getByLabelText('Drafts')).toBeInTheDocument();
  });

  it('calls onNewConfession when new confession button is clicked', () => {
    render(
      <QuickActions
        onNewConfession={mockOnNewConfession}
        onOpenDrafts={mockOnOpenDrafts}
        onScrollToTop={mockOnScrollToTop}
      />
    );

    // First expand the menu
    const fabButton = screen.getByLabelText('Scroll to Top');
    fireEvent.click(fabButton);

    // Then click new confession
    const newConfessionButton = screen.getByLabelText('New Confession');
    fireEvent.click(newConfessionButton);

    expect(mockOnNewConfession).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenDrafts when drafts button is clicked', () => {
    render(
      <QuickActions
        onNewConfession={mockOnNewConfession}
        onOpenDrafts={mockOnOpenDrafts}
        onScrollToTop={mockOnScrollToTop}
      />
    );

    // First expand the menu
    const fabButton = screen.getByLabelText('Scroll to Top');
    fireEvent.click(fabButton);

    // Then click drafts
    const draftsButton = screen.getByLabelText('Drafts');
    fireEvent.click(draftsButton);

    expect(mockOnOpenDrafts).toHaveBeenCalledTimes(1);
  });

  it('collapses the menu after an action button is clicked', () => {
    render(
      <QuickActions
        onNewConfession={mockOnNewConfession}
        onOpenDrafts={mockOnOpenDrafts}
        onScrollToTop={mockOnScrollToTop}
      />
    );

    // Expand the menu
    const fabButton = screen.getByLabelText('Scroll to Top');
    fireEvent.click(fabButton);

    // Click an action
    const newConfessionButton = screen.getByLabelText('New Confession');
    fireEvent.click(newConfessionButton);

    // Menu should collapse (action buttons should no longer be visible)
    expect(screen.queryByLabelText('New Confession')).not.toBeInTheDocument();
  });
});
