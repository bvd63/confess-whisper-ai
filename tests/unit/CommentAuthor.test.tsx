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

    // The component should render something (CommentAuthor passes clickable={false})
    // so UserDisplayName will render as a non-clickable span
    await waitFor(() => {
      const authorElement = screen.getByText(/Anonymous/);
      expect(authorElement).toBeInTheDocument();
    });
  });
});
