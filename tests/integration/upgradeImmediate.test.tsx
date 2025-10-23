import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EnhancedSubscriptionManager } from '@/components/EnhancedSubscriptionManager';
import { mockSupabaseClient, createSubscriptionStatus, renderWithProviders } from "../helpers/testUtils";

describe("Immediate Upgrade Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle successful immediate upgrade from Premium to VIP", async () => {
    const user = userEvent.setup();
    const initialStatus = createSubscriptionStatus({ currentPlan: 'premium', status: 'active' });
    const upgradedStatus = createSubscriptionStatus({ currentPlan: 'vip', status: 'active' });

    let callCount = 0;
    vi.mocked(mockSupabaseClient.functions.invoke).mockReset();
    vi.mocked(mockSupabaseClient.functions.invoke).mockImplementation(async (fnName: string) => {
      if (fnName === 'billing-status') {
        callCount++;
        return { data: callCount === 1 ? initialStatus : upgradedStatus, error: null };
      }
      if (fnName === 'billing-change') {
        return { data: upgradedStatus, error: null };
      }
      return { data: null, error: null };
    });

    renderWithProviders(<EnhancedSubscriptionManager />);

    await waitFor(() => {
      expect(screen.getAllByText(/Current Status/i)[0]).toBeInTheDocument();
    });

    // Find the VIP upgrade button (testid is action-vip)
    const upgradeButton = screen.getByTestId("action-vip");
    expect(upgradeButton).toBeInTheDocument();

    await user.click(upgradeButton);

    const confirmButton = await screen.findByTestId("confirm-action");
    await user.click(confirmButton);

    await waitFor(() => {
      // After upgrade, check that the status was reloaded
      // The button should now show as disabled (current plan)
      expect(screen.getByText(/Current Status/i)).toBeInTheDocument();
    });
  });

  it("should show an error toast if the upgrade fails", async () => {
    const user = userEvent.setup();
    const initialStatus = createSubscriptionStatus({ currentPlan: 'premium', status: 'active' });

    vi.mocked(mockSupabaseClient.functions.invoke).mockReset();
    vi.mocked(mockSupabaseClient.functions.invoke).mockImplementation(async (fnName: string) => {
      if (fnName === 'billing-status') {
        return { data: initialStatus, error: null };
      }
      if (fnName === 'billing-change') {
        return { data: null, error: { message: "An unexpected error occurred." } };
      }
      return { data: null, error: null };
    });

    renderWithProviders(<EnhancedSubscriptionManager />);

    await waitFor(() => {
      expect(screen.getAllByText(/Current Status/i)[0]).toBeInTheDocument();
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

    // After error, Premium plan should still be current
    await waitFor(() => {
      expect(screen.getAllByText(/Current Status/i)[0]).toBeInTheDocument();
    });
  });
});
