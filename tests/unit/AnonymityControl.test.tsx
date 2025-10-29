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

    await waitFor(() => {
      const toggle = screen.getByRole('switch');
      fireEvent.click(toggle);
    });

    await waitFor(() => {
      expect(screen.getByText(/posting as:/i)).toBeInTheDocument();
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
