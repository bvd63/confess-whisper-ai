import "../helpers/testUtils";

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../helpers/testUtils";
import { supabase } from "@/integrations/supabase/client";
import { getAiReply } from "@/services/aiService";
import NewConfessionDialog from "@/components/NewConfessionDialog";

const toastMock = vi.fn();
const dismissToastMock = vi.fn();
const incrementCountMock = vi.fn();
const checkLimitsMock = vi.fn();
const checkForCrisisMock = vi.fn(() => false);
const getAiReplyMock = getAiReply as unknown as Mock;
let canPostFlag = true;

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock, toasts: [], dismiss: dismissToastMock }),
}));

vi.mock("@/contexts/LanguageContext", async () => {
  const { translations } = await vi.importActual<typeof import("@/i18n/translations")>("@/i18n/translations");

  const mockValue = {
    language: "en",
    setLanguage: vi.fn(),
    t: translations.en,
  };

  return {
    LanguageProvider: ({ children }: { children: any }) => children,
    useLanguage: () => mockValue,
  };
});

vi.mock("@/lib/env", () => ({
  env: {
    client: {
      supabaseUrl: "http://localhost:54321",
      supabaseAnonKey: "public-anon-key",
      stripePriceVipMonthId: null,
      stripePriceVipYearId: null,
      oneSignalAppId: null,
      sentryDsn: null,
    },
    features: {
      passwordless: false,
      offlineQueue: false,
      backgroundQueue: false,
      pwaPrompt: false,
      profileMiniAnalytics: false,
      webShareEnabled: false,
      confessionTurnstileRequired: false,
    },
    isProd: false,
    isDev: true,
  },
}));

vi.mock("@/hooks/useConfessionLimits", () => ({
  useConfessionLimits: () => ({
    canPost: canPostFlag,
    currentCount: 0,
    dailyLimit: 5,
    remaining: 5,
    tier: "free",
    isLoading: false,
    checkLimits: checkLimitsMock,
    incrementCount: incrementCountMock,
  }),
}));

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: { id: "user-1", email: "user@example.com" },
    session: null,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/usePremiumStatus", () => ({
  usePremiumStatus: () => ({
    subscriptionTier: "free",
    isOnTrial: false,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useModerationStatus", () => ({
  useModerationStatus: () => ({
    checkForCrisis: checkForCrisisMock,
  }),
}));

vi.mock("@/hooks/useCommunities", () => ({
  useCommunities: () => ({
    communities: [],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useMobileKeyboard", () => ({
  useMobileKeyboard: () => ({
    isKeyboardVisible: false,
    keyboardHeight: 0,
  }),
}));

vi.mock("@/services/aiService", () => ({
  getAiReply: vi.fn().mockResolvedValue("AI support message"),
}));

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: () => null,
}));

const submitButtonText = /Submit confession/i;
const successTitle = "Your confession was sent! 💜";
const rateLimitMessage = "Too many requests. Please try again later.";
const moderationMessage = "Content not allowed. Please rephrase.";

const functionsInvokeMock = supabase.functions.invoke as unknown as Mock;

describe("NewConfessionDialog", () => {

  const defaultInvoke = async (name: string, options?: any) => {
    if (name === "ai-moderation") {
      return { data: { is_safe: true }, error: null };
    }
    if (name === "create-confession") {
      return {
        data: {
          confession: {
            id: "confession-xyz",
            content: options?.body?.content ?? "",
          },
          rateLimit: null,
        },
        error: null,
      };
    }
    return { data: null, error: null };
  };

  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();

    incrementCountMock.mockReset();
    incrementCountMock.mockResolvedValue(undefined);
    checkLimitsMock.mockReset();
    checkLimitsMock.mockResolvedValue(undefined);
    checkForCrisisMock.mockReturnValue(false);
  toastMock.mockReset();
  dismissToastMock.mockReset();
  getAiReplyMock.mockClear();
    getAiReplyMock.mockResolvedValue("AI support message");
    canPostFlag = true;

    functionsInvokeMock.mockReset();
    functionsInvokeMock.mockImplementation(defaultInvoke);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderDialog = () => {
    const onConfessionCreated = vi.fn();
    const onOpenChange = vi.fn();

    renderWithProviders(
      <NewConfessionDialog
        open
        onOpenChange={onOpenChange}
        onConfessionCreated={onConfessionCreated}
      />
    );

    return { onConfessionCreated, onOpenChange };
  };

  const enterConfession = async (value = "This is a sincere confession that is perfectly safe.") => {
    const input = await screen.findByRole("textbox");
    fireEvent.change(input, {
      target: { value },
    });
  };

  it("submits a confession successfully", async () => {
    const { onConfessionCreated, onOpenChange } = renderDialog();

    await enterConfession();

    fireEvent.click(await screen.findByRole("button", { name: submitButtonText }));

    await waitFor(() =>
      expect(functionsInvokeMock).toHaveBeenCalledWith(
        "create-confession",
        expect.objectContaining({
          body: expect.objectContaining({
            content: expect.stringContaining("sincere confession"),
            isAnonymous: true,
          }),
        })
      )
    );

    await waitFor(() => expect(incrementCountMock).toHaveBeenCalled());
    expect(getAiReplyMock).toHaveBeenCalled();

  await waitFor(() => expect(onConfessionCreated).toHaveBeenCalled(), { timeout: 4000 });
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false), { timeout: 4000 });
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: successTitle })
    );
  });

  it("surfaces a rate limit error from the server", async () => {
    functionsInvokeMock.mockImplementation(async (name: string, options?: any) => {
      if (name === "ai-moderation") {
        return { data: { is_safe: true }, error: null };
      }
      if (name === "create-confession") {
        return {
          data: null,
          error: { status: 429, message: JSON.stringify({ messageKey: "common.rate_limit" }) },
        };
      }
      return defaultInvoke(name, options);
    });

    const { onConfessionCreated, onOpenChange } = renderDialog();

    await enterConfession();
    fireEvent.click(await screen.findByRole("button", { name: submitButtonText }));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ description: rateLimitMessage, variant: "destructive" })
      )
    );

    expect(incrementCountMock).not.toHaveBeenCalled();
    expect(onConfessionCreated).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("blocks submission when moderation flags the content", async () => {
    functionsInvokeMock.mockImplementation(async (name: string, options?: any) => {
      if (name === "ai-moderation") {
        return { data: { is_safe: false, reason: "Flagged" }, error: null };
      }
      return defaultInvoke(name, options);
    });

    const { onConfessionCreated, onOpenChange } = renderDialog();

    await enterConfession("This confession mentions restricted keywords.");
    fireEvent.click(await screen.findByRole("button", { name: submitButtonText }));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: moderationMessage, variant: "destructive" })
      )
    );

    expect(functionsInvokeMock).not.toHaveBeenCalledWith("create-confession", expect.anything());
    expect(incrementCountMock).not.toHaveBeenCalled();
    expect(onConfessionCreated).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
