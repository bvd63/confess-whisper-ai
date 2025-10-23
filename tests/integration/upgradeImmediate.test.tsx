import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EnhancedSubscriptionManager } from '@/components/EnhancedSubscriptionManager';
import { mockSupabaseClient, createSubscriptionStatus, renderWithProviders } from "../helpers/testUtils";

describe("Immediate Upgrade Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle successful immediate upgrade from Free to VIP", async () => {
    const user = userEvent.setup();
    const initialStatus = createSubscriptionStatus({ currentPlan: 'free', status: 'active' });
    const upgradedStatus = createSubscriptionStatus({ currentPlan: 'vip', status: 'active' });

    const mockWindowOpen = vi.fn();
    window.open = mockWindowOpen;

    let callCount = 0;
    vi.mocked(mockSupabaseClient.functions.invoke).mockReset();
    vi.mocked(mockSupabaseClient.functions.invoke).mockImplementation(async (fnName: string) => {
      if (fnName === 'billing-status') {
        callCount++;
        return { data: callCount === 1 ? initialStatus : upgradedStatus, error: null };
      }
      if (fnName === 'create-checkout-session') {
        return { data: { url: 'https://stripe.com/checkout/test' }, error: null };
      }
      return { data: null, error: null };
    });

    renderWithProviders(<EnhancedSubscriptionManager />);

    await waitFor(() => {
      expect(screen.getByTestId('manage-subscription-modal')).toBeInTheDocument();
    });

    // Find the VIP upgrade button (testid is action-vip)
    const upgradeButton = screen.getByTestId("action-vip");
    expect(upgradeButton).toBeInTheDocument();

    await user.click(upgradeButton);

    const confirmButton = await screen.findByTestId("confirm-action");
    await user.click(confirmButton);

    await waitFor(() => {
      // After clicking confirm, should redirect to Stripe checkout
      expect(mockWindowOpen).toHaveBeenCalledWith('https://stripe.com/checkout/test', '_blank');
    });
  });

  it("should show an error toast if the upgrade fails", async () => {
    const user = userEvent.setup();
    const initialStatus = createSubscriptionStatus({ currentPlan: 'free', status: 'active' });

    vi.mocked(mockSupabaseClient.functions.invoke).mockReset();
    vi.mocked(mockSupabaseClient.functions.invoke).mockImplementation(async (fnName: string) => {
      if (fnName === 'billing-status') {
        return { data: initialStatus, error: null };
      }
      if (fnName === 'create-checkout-session') {
        return { data: null, error: { message: "An unexpected error occurred." } };
      }
      return { data: null, error: null };
    });

    renderWithProviders(<EnhancedSubscriptionManager />);

    await waitFor(() => {
      expect(screen.getByTestId('manage-subscription-modal')).toBeInTheDocument();
    });

    const upgradeButton = screen.getByTestId("action-vip");
    expect(upgradeButton).toBeInTheDocument();

    await user.click(upgradeButton);

    const confirmButton = await screen.findByTestId("confirm-action");
    await user.click(confirmButton);

    await waitFor(() => {
      // Dialog should close after error is handled
      expect(screen.queryByTestId("confirm-action")).not.toBeInTheDocument();
    });
  });
});
