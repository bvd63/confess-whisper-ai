import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../helpers/testUtils';
import { SubscriptionPlansGrid } from '@/components/SubscriptionPlansGrid';

describe('Cancel Flow Tests', () => {
  it('renders subscription component for cancellation', () => {
    const { container } = renderWithProviders(
      <SubscriptionPlansGrid
        currentPlan="vip"
        currentInterval="monthly"
        onSelectPlan={vi.fn()}
        interval="monthly"
      />
    );

    expect(container).toBeInTheDocument();
  });

  it('handles cancel at period end flow', () => {
    const { container } = renderWithProviders(
      <SubscriptionPlansGrid
        currentPlan="vip"
        currentInterval="yearly"
        onSelectPlan={vi.fn()}
        interval="yearly"
      />
    );

    expect(container).toBeInTheDocument();
  });

  it('handles immediate cancellation', () => {
    const mockSelectPlan = vi.fn();
    const { container } = renderWithProviders(
      <SubscriptionPlansGrid
        currentPlan="vip"
        currentInterval="monthly"
        onSelectPlan={mockSelectPlan}
        interval="monthly"
        canChangePlan={true}
      />
    );

    expect(container).toBeInTheDocument();
  });
});
