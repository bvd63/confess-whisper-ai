import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../helpers/testUtils';
import { SubscriptionPlansGrid } from '@/components/SubscriptionPlansGrid';

describe('Subscription Plans Grid', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(
      <SubscriptionPlansGrid
        currentPlan="free"
        currentInterval="monthly"
        onSelectPlan={vi.fn()}
        isLoading={false}
        canChangePlan={true}
        interval="monthly"
        onIntervalChange={vi.fn()}
      />
    );

    expect(container).toBeInTheDocument();
  });

  it('renders for VIP user', () => {
    const { container } = renderWithProviders(
      <SubscriptionPlansGrid
        currentPlan="vip"
        currentInterval="monthly"
        onSelectPlan={vi.fn()}
        isLoading={false}
        canChangePlan={false}
        interval="monthly"
        onIntervalChange={vi.fn()}
      />
    );

    expect(container).toBeInTheDocument();
  });

  it('handles loading state', () => {
    const { container } = renderWithProviders(
      <SubscriptionPlansGrid
        currentPlan="free"
        currentInterval="monthly"
        onSelectPlan={vi.fn()}
        isLoading={true}
        canChangePlan={true}
        interval="monthly"
        onIntervalChange={vi.fn()}
      />
    );

    expect(container).toBeInTheDocument();
  });

  it('renders yearly interval', () => {
    const { container } = renderWithProviders(
      <SubscriptionPlansGrid
        currentPlan="free"
        currentInterval="monthly"
        onSelectPlan={vi.fn()}
        isLoading={false}
        canChangePlan={true}
        interval="yearly"
        onIntervalChange={vi.fn()}
      />
    );

    expect(container).toBeInTheDocument();
  });
});
