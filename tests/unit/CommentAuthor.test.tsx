import { vi, describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/testUtils";
import { CommentAuthor } from '@/components/CommentAuthor';

describe("CommentAuthor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders author information correctly", async () => {
    renderWithProviders(<CommentAuthor userId="123" />);

    const authorElement = await screen.findByLabelText(/anonymous/i);
    expect(authorElement).toBeInTheDocument();
  });
});
