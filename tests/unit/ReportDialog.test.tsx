import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import type { Mock } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../helpers/testUtils";
import ReportDialog from "../../src/components/ReportDialog";
import * as ConfirmContext from "../../src/contexts/ConfirmContext";
import * as ToastHook from "../../src/hooks/use-toast";
import { supabase } from "../../src/integrations/supabase/client";
import type { ComponentProps } from "react";

const SUCCESS_TITLE = "Report sent. We'll review this confession. Thank you!";
const DUPLICATE_TITLE = "Already reported";
const RATE_LIMIT_TITLE = "Too Many Requests";

const selectReason = async () => {
  const reasonOption = await screen.findByLabelText(/Spam or advertising/i);
  fireEvent.click(reasonOption);
};

const enterDetails = async (value = "This content is abusive") => {
  const detailsInput = await screen.findByLabelText(/Additional details \(optional\)/i);
  fireEvent.change(detailsInput, { target: { value } });
};

describe("ReportDialog", () => {
  const toastMock = vi.fn();
  const confirmMock = vi.fn();
  let toastSpy: ReturnType<typeof vi.spyOn>;
  let confirmSpy: ReturnType<typeof vi.spyOn>;
  let functionsInvokeMock: Mock;
  let originalInvoke: ((...args: any[]) => any) | undefined;

  beforeAll(() => {
  functionsInvokeMock = supabase.functions.invoke as unknown as Mock;
    originalInvoke = functionsInvokeMock.getMockImplementation();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    toastMock.mockReset();
    confirmMock.mockReset();
    confirmMock.mockResolvedValue(true);

    toastSpy = vi
      .spyOn(ToastHook, "useToast")
      .mockReturnValue({ toasts: [], toast: toastMock, dismiss: vi.fn() } as any);

    confirmSpy = vi.spyOn(ConfirmContext, "useConfirm").mockReturnValue(confirmMock as any);

    functionsInvokeMock.mockImplementation(async (name: string, options?: any) => {
      if (name === "report-confession") {
        return { data: { success: true }, error: null };
      }
      if (originalInvoke) {
        return originalInvoke(name, options);
      }
      return { data: null, error: null };
    });
  });

  afterEach(() => {
    toastSpy.mockRestore();
    confirmSpy.mockRestore();
    if (originalInvoke) {
      functionsInvokeMock.mockImplementation(originalInvoke);
    }
  });

  const renderDialog = (overrides: Partial<ComponentProps<typeof ReportDialog>> = {}) => {
    const onOpenChange = vi.fn();
    renderWithProviders(
      <ReportDialog
        open
        onOpenChange={onOpenChange}
        confessionId="confession-123"
        userId="user-1"
        {...overrides}
      />
    );
    return { onOpenChange };
  };

  it("submits a report successfully", async () => {
    const { onOpenChange } = renderDialog();

  await selectReason();
  await enterDetails();

    fireEvent.click(screen.getByRole("button", { name: /Submit Report/i }));

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(functionsInvokeMock).toHaveBeenCalledWith(
        "report-confession",
        expect.objectContaining({
          body: expect.objectContaining({
            confessionId: "confession-123",
            reason: "spam",
            details: "This content is abusive",
            language: "en",
          }),
        })
      )
    );

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: SUCCESS_TITLE })
      )
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows duplicate warning when report was already submitted", async () => {
    functionsInvokeMock.mockImplementationOnce(async () => ({
      data: null,
      error: { status: 409, message: "ALREADY_REPORTED" },
    }));

    const { onOpenChange } = renderDialog();

  await selectReason();
  await enterDetails();

    fireEvent.click(screen.getByRole("button", { name: /Submit Report/i }));

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: DUPLICATE_TITLE })
      )
    );
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("surfaces a rate limit toast when throttled", async () => {
    functionsInvokeMock.mockImplementationOnce(async () => ({
      data: null,
      error: { status: 429, message: JSON.stringify({ messageKey: "common.rate_limit" }) },
    }));

    renderDialog();
  await selectReason();
  await enterDetails();

    fireEvent.click(screen.getByRole("button", { name: /Submit Report/i }));

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: RATE_LIMIT_TITLE })
      )
    );
  });

  it("aborts when the confirmation dialog is rejected", async () => {
    confirmMock.mockReset();
    confirmMock.mockResolvedValueOnce(false);
    confirmSpy.mockReturnValue(confirmMock as any);

    renderDialog();
  await selectReason();
  await enterDetails();

    fireEvent.click(screen.getByRole("button", { name: /Submit Report/i }));

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(functionsInvokeMock).not.toHaveBeenCalledWith("report-confession", expect.anything());
    expect(toastMock).not.toHaveBeenCalled();
  });
});
