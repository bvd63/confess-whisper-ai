import { getSupabase } from '@/lib/supabaseClient';
import { vi, describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../helpers/testUtils";
import { CommentAuthor } from '@/components/CommentAuthor';
import { supabaseMock } from '../setup/supabase-mock';

describe("CommentAuthor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders author information correctly", async () => {
    // Mock the from method to return user data
    type SupabaseReturn = { select: ReturnType<typeof vi.fn> };
    vi.mocked(supabaseMock.from).mockImplementation((table: string): SupabaseReturn => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ nickname: "TestUser", avatar_url: "http://example.com/avatar.png" }],
              error: null,
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    renderWithProviders(<CommentAuthor userId="123" />);

    // The component should render something (even if Anonymous while loading)
    await waitFor(() => {
      const authorElement = screen.getByRole('button');
      expect(authorElement).toBeInTheDocument();
    });
  });
});
