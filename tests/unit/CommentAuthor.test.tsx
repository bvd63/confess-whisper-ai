import { vi, describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../helpers/testUtils";
import { CommentAuthor } from '@/components/CommentAuthor';

describe("CommentAuthor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders author information correctly", async () => {
    renderWithProviders(<CommentAuthor userId="123" />);

    // The component should render something (even if Anonymous while loading)
    await waitFor(() => {
      // UserDisplayName renders a clickable span with role="button"
      const authorElement = screen.getByRole('button');
      expect(authorElement).toBeInTheDocument();
    });
  });
});
