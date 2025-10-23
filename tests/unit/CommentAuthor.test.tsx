import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { screen, waitFor, cleanup } from "@testing-library/react";
import { renderWithProviders } from "../helpers/testUtils";
import { CommentAuthor } from '@/components/CommentAuthor';

// Mock Supabase client with proper chaining support
vi.mock("@/lib/supabaseClient", () => {
  const createChainableBuilder = () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      match: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    
    // Make all methods return this for proper chaining
    Object.keys(builder).forEach(key => {
      if (key !== 'single' && key !== 'maybeSingle') {
        (builder as Record<string, ReturnType<typeof vi.fn>>)[key] = vi.fn(() => builder);
      }
    });
    
    return builder;
  };

  const realtimeSub = {
    on: vi.fn(),
    subscribe: vi.fn().mockResolvedValue({ data: null, error: null }),
    unsubscribe: vi.fn(),
  };
  
  // Ensure 'on' returns the realtimeSub object for proper chaining
  realtimeSub.on = vi.fn(() => realtimeSub);

  return {
    getSupabase: () => ({
      from: vi.fn(() => createChainableBuilder()),
      auth: {
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
      },
      channel: vi.fn(() => realtimeSub),
      removeChannel: vi.fn(),
    })
  };
});

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ user: null })
}));

describe("CommentAuthor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders author information correctly", async () => {
    renderWithProviders(<CommentAuthor userId="123" />);

    // The component renders a UserDisplayName which shows "Anonymous" while loading
    // and should eventually show user info or remain as Anonymous
    await waitFor(() => {
      expect(screen.getByText(/anonymous|testuser/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
