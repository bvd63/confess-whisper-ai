import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../helpers/testUtils";
import { NewConfessionDialog } from "@/components/NewConfessionDialog";

// ✅ Global mocks
vi.mock("@/lib/supabaseClient", () => {
  const createChainableBuilder = () => {
    const builder = {
      select: vi.fn(),
      eq: vi.fn(),
      neq: vi.fn(),
      in: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      filter: vi.fn(),
      match: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
    };
    
    // Make all chainable methods return the builder
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.neq.mockReturnValue(builder);
    builder.in.mockReturnValue(builder);
    builder.order.mockReturnValue(builder);
    builder.limit.mockReturnValue(builder);
    builder.filter.mockReturnValue(builder);
    builder.match.mockReturnValue(builder);
    
    // Make terminal methods return promises
    builder.insert.mockResolvedValue({ data: [{ id: 1 }], error: null });
    builder.update.mockResolvedValue({ data: [], error: null });
    builder.delete.mockResolvedValue({ data: [], error: null });
    builder.single.mockResolvedValue({ data: null, error: null });
    builder.maybeSingle.mockResolvedValue({ data: null, error: null });
    
    return builder;
  };

  const realtimeSub = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockResolvedValue({ data: null, error: null }),
    unsubscribe: vi.fn(),
  };

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
      functions: {
        invoke: vi.fn(async (fn: string) => {
          if (fn === "ai-moderation") return { data: { is_safe: true }, error: null };
          if (fn === "ai-confession-response") return { data: { response: "AI reply text" }, error: null };
          return { data: {}, error: null };
        })
      },
      channel: vi.fn(() => realtimeSub),
      removeChannel: vi.fn(),
    })
  };
});

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ user: { id: "user123" } })
}));

vi.mock("@/hooks/useLanguage", () => ({
  useLanguage: () => ({
    language: "en",
    t: {
      new_confession: "New Confession",
      placeholder_confession: "Write your confession...",
      submit: "Submit",
      submitting: "Submitting...",
      success_sent: "Sent successfully",
      ai_reply_title: "AI Reply",
      error_generic: "Error",
      error_submit: "Failed to submit",
      error_auth: "Authentication error",
      toast_flagged: "Flagged content",
      select_category: "Select Category",
      location_community_optional: "Community",
      location_optional: "Location",
      location_no_community: "No community",
      location_select_community: "Select community",
      category_other: "Other",
      limit_confessions_remaining: "You have {count} confessions left",
      limit_confessions_unlimited: "Unlimited confessions"
    }
  })
}));

// mock other hooks with simple no-ops
vi.mock("@/hooks/useConfessionLimits", () => ({
  useConfessionLimits: () => ({
    canPost: true,
    currentCount: 0,
    dailyLimit: 5,
    remaining: 5,
    tier: "free",
    checkLimits: vi.fn(),
    incrementCount: vi.fn(),
    isLoading: false
  })
}));

vi.mock("@/hooks/useModerationStatus", () => ({
  useModerationStatus: () => ({ checkForCrisis: () => false })
}));

vi.mock("@/hooks/useCommunities", () => ({
  useCommunities: () => ({ communities: [] })
}));

vi.mock("@/components/MoodTracker", () => ({
  __esModule: true,
  default: ({ onMoodSelect }: { onMoodSelect: (mood: string, intensity: number) => void }) => (
    <button onClick={() => onMoodSelect("happy", 5)}>Select mood</button>
  )
}));

vi.mock("@/components/ImageUpload", () => ({
  __esModule: true,
  default: ({ onImageUploaded }: { onImageUploaded: (url: string) => void }) => (
    <button onClick={() => onImageUploaded("mock.jpg")}>Upload image</button>
  )
}));

vi.mock("@/components/DraftManager", () => ({
  __esModule: true,
  default: () => null
}));

vi.mock("@/components/LocationPicker", () => ({
  __esModule: true,
  LocationPicker: ({ onLocationSelect }: { onLocationSelect: (loc: { lat: number; lng: number }) => void }) => (
    <button onClick={() => onLocationSelect({ lat: 0, lng: 0 })}>Pick location</button>
  )
}));

vi.mock("@/components/PolishConfessionButton", () => ({
  PolishConfessionButton: ({ text, onPolished }: { text: string; onPolished?: (polishedText: string) => void }) => (
    <button onClick={() => onPolished?.(text + " (polished)")}>Polish</button>
  )
}));

vi.mock("@/components/CrisisDialog", () => ({
  __esModule: true,
  CrisisDialog: () => null
}));

vi.mock("@/components/UpgradeModal", () => ({
  __esModule: true,
  UpgradeModal: () => null
}));

describe("NewConfessionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the dialog with required fields", async () => {
    const onConfessionCreated = vi.fn();
    const onOpenChange = vi.fn();

    renderWithProviders(
      <NewConfessionDialog
        open={true}
        onOpenChange={onOpenChange}
        onConfessionCreated={onConfessionCreated}
      />
    );

    // Check that the dialog renders with the correct placeholder
    expect(await screen.findByPlaceholderText(/share what's on your mind/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });
});
