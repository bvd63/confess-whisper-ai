import { vi, describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../helpers/testUtils";
import ConfessionCard from '@/components/ConfessionCard';

describe("Anonymity Display in Confession Card", () => {
  const baseConfession = {
    id: "test-id",
    content: "Test confession",
    category: "other",
    user_id: "user-123",
    created_at: new Date().toISOString(),
    likes_count: 0,
    comments_count: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'Anonymous' when is_anonymous is true", async () => {
    const confession = {
      ...baseConfession,
      is_anonymous: true,
      author_display_name_snapshot: null,
    };

    renderWithProviders(
      <ConfessionCard
        confession={confession}
        isPremium={false}
        isLiked={false}
        isBookmarked={false}
        onUpgradeClick={vi.fn()}
        onInsightGenerated={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/anonymous/i)).toBeInTheDocument();
    });
  });

  it("shows username when is_anonymous is false", async () => {
    const confession = {
      ...baseConfession,
      is_anonymous: false,
      author_display_name_snapshot: "testuser",
    };

    renderWithProviders(
      <ConfessionCard
        confession={confession}
        isPremium={false}
        isLiked={false}
        isBookmarked={false}
        onUpgradeClick={vi.fn()}
        onInsightGenerated={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/@testuser/i)).toBeInTheDocument();
    });
  });

  it("falls back to 'Anonymous' when is_anonymous is false but no display name", async () => {
    const confession = {
      ...baseConfession,
      is_anonymous: false,
      author_display_name_snapshot: null,
    };

    renderWithProviders(
      <ConfessionCard
        confession={confession}
        isPremium={false}
        isLiked={false}
        isBookmarked={false}
        onUpgradeClick={vi.fn()}
        onInsightGenerated={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/anonymous/i)).toBeInTheDocument();
    });
  });
});
