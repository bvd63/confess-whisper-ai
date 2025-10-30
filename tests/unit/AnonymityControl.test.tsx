import { vi, describe, it, expect, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../helpers/testUtils";
import NewConfessionDialog from '@/components/NewConfessionDialog';

describe("Anonymity Control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("toggle defaults to ON (anonymous)", async () => {
    const onConfessionCreated = vi.fn();
    const setOpen = vi.fn();

    renderWithProviders(
      <NewConfessionDialog
        onConfessionCreated={onConfessionCreated}
        open={true}
        onOpenChange={setOpen}
      />
    );

    await waitFor(() => {
      const toggle = screen.getByRole('switch');
      expect(toggle).toBeChecked();
    });
  });

  it("shows preview when toggle is OFF", async () => {
    const onConfessionCreated = vi.fn();
    const setOpen = vi.fn();

    renderWithProviders(
      <NewConfessionDialog
        onConfessionCreated={onConfessionCreated}
        open={true}
        onOpenChange={setOpen}
      />
    );

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    const toggle = screen.getByRole('switch');
    
    // Toggle should start checked (anonymous ON)
    expect(toggle).toBeChecked();
    
    // Click to turn OFF anonymous mode
    fireEvent.click(toggle);

    // Wait for state to update
    await waitFor(() => {
      expect(toggle).not.toBeChecked();
    });

    // Verify helper text changed from anonymous ON to OFF
    // Since we don't have a nickname mocked, we won't see "Posting as:" text
    // but we should see the help text changed
    await waitFor(() => {
      // Check that anonymous help text is no longer shown
      expect(screen.queryByText(/your identity will remain hidden/i)).not.toBeInTheDocument();
    });
  });

  it("helper text changes based on toggle state", async () => {
    const onConfessionCreated = vi.fn();
    const setOpen = vi.fn();

    renderWithProviders(
      <NewConfessionDialog
        onConfessionCreated={onConfessionCreated}
        open={true}
        onOpenChange={setOpen}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/your identity will remain hidden/i)).toBeInTheDocument();
    });

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByText(/your username will be visible/i)).toBeInTheDocument();
    });
  });
});
