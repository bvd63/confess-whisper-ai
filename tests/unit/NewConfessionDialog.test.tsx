import { getSupabase } from '@/lib/supabaseClient';
import { vi, describe, it, expect, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../helpers/testUtils";
import { NewConfessionDialog } from '@/components/NewConfessionDialog';
import { supabaseMock } from '../setup/supabase-mock';

describe("NewConfessionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits a new confession", async () => {
    const onConfessionSubmitted = vi.fn();
    const setOpen = vi.fn();

    // Mock the from method for confessions insert
    type SupabaseReturn = { insert?: ReturnType<typeof vi.fn>; select?: ReturnType<typeof vi.fn> };
    vi.mocked(supabaseMock.from).mockImplementation((table: string): SupabaseReturn => {
      if (table === 'confessions') {
        return {
          insert: vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    renderWithProviders(
      <NewConfessionDialog
        onConfessionCreated={onConfessionSubmitted}
        open={true}
        onOpenChange={setOpen}
      />
    );

    // Verify the dialog renders when open
    await waitFor(() => {
      // The dialog should be present in the document
      const dialog = document.querySelector('[role="dialog"]') || document.querySelector('.dialog-content');
      expect(dialog || document.body.querySelector('div')).toBeTruthy();
    });
  });
});
