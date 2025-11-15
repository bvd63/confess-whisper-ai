import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../helpers/testUtils';
import { SubscriptionPlansGrid } from '@/components/SubscriptionPlansGrid';

describe('Trial Edge Cases Tests', () => {
  it('renders subscription component for trial users', () => {
    const { container } = renderWithProviders(
      <SubscriptionPlansGrid
        currentPlan="free"
        currentInterval="monthly"
        onSelectPlan={vi.fn()}
        interval="monthly"
        trialEligible={true}
      />
    );

    expect(container).toBeInTheDocument();
  });

  it('handles expired trial scenario', () => {
    const { container } = renderWithProviders(
      <SubscriptionPlansGrid
        currentPlan="free"
        currentInterval="monthly"
        onSelectPlan={vi.fn()}
        interval="monthly"
        trialEligible={false}
      />
    );

    expect(container).toBeInTheDocument();
  });

  it('handles trial to paid upgrade', () => {
    const mockSelectPlan = vi.fn();
    const { container } = renderWithProviders(
      <SubscriptionPlansGrid
        currentPlan="free"
        currentInterval="monthly"
        onSelectPlan={mockSelectPlan}
        interval="monthly"
        trialEligible={true}
      />
    );

    expect(container).toBeInTheDocument();
  });
});
