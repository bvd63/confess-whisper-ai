import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../helpers/testUtils';
import { SubscriptionPlansGrid } from '@/components/SubscriptionPlansGrid';

describe('Subscription Component Test', () => {
  it('renders subscription component', () => {
    const { container } = renderWithProviders(
      <SubscriptionPlansGrid
        currentPlan="free"
        currentInterval="monthly"
        onSelectPlan={vi.fn()}
        interval="monthly"
      />
    );

    expect(container).toBeInTheDocument();
  });

  it('handles VIP plan', () => {
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
});
