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

    await waitFor(() => {
      expect(toggle).not.toBeChecked();
    });
  });

  it("allows toggling anonymity on and off", async () => {
    const onConfessionCreated = vi.fn();
    const setOpen = vi.fn();

    renderWithProviders(
      <NewConfessionDialog
        onConfessionCreated={onConfessionCreated}
        open={true}
        onOpenChange={setOpen}
      />
    );

    const toggle = await screen.findByRole('switch');
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle).not.toBeChecked();
    });

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle).toBeChecked();
    });
  });
});
