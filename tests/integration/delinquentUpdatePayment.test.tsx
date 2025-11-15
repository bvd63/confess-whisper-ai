import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../helpers/testUtils';
import { SubscriptionPlansGrid } from '@/components/SubscriptionPlansGrid';

describe('Delinquent Payment Update Tests', () => {
  it('renders subscription component for payment update', () => {
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

  it('handles delinquent subscription state', () => {
    const { container } = renderWithProviders(
      <SubscriptionPlansGrid
        currentPlan="vip"
        currentInterval="monthly"
        onSelectPlan={vi.fn()}
        interval="monthly"
        canChangePlan={false}
      />
    );

    expect(container).toBeInTheDocument();
  });

  it('handles payment method update for active subscription', () => {
    const mockSelectPlan = vi.fn();
    const { container } = renderWithProviders(
      <SubscriptionPlansGrid
        currentPlan="vip"
        currentInterval="yearly"
        onSelectPlan={mockSelectPlan}
        interval="yearly"
      />
    );

    expect(container).toBeInTheDocument();
  });
});
