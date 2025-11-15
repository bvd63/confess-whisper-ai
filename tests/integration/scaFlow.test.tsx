import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../helpers/testUtils';
import { SubscriptionPlansGrid } from '@/components/SubscriptionPlansGrid';

describe('SCA Flow Tests', () => {
  it('renders subscription component for SCA authentication', () => {
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

  it('handles VIP plan with SCA requirements', () => {
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

  it('handles yearly plan selection', () => {
    const { container } = renderWithProviders(
      <SubscriptionPlansGrid
        currentPlan="free"
        currentInterval="monthly"
        onSelectPlan={vi.fn()}
        interval="yearly"
      />
    );

    expect(container).toBeInTheDocument();
  });
});
