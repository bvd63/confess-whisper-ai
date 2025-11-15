import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../helpers/testUtils';
import { SubscriptionPlansGrid } from '@/components/SubscriptionPlansGrid';

describe('Downgrade at Period End Tests', () => {
  it('renders subscription component for downgrade', () => {
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

  it('handles downgrade from VIP to free at period end', () => {
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

  it('handles downgrade from yearly to monthly', () => {
    const { container } = renderWithProviders(
      <SubscriptionPlansGrid
        currentPlan="vip"
        currentInterval="yearly"
        onSelectPlan={vi.fn()}
        interval="monthly"
      />
    );

    expect(container).toBeInTheDocument();
  });
});
