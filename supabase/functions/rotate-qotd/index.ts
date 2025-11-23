import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { logError, logInfo, logWarn } from "../_shared/logger.ts";
import { ensureEdgeAuthorized, getRequestContext } from "../_shared/security.ts";
import { createServiceClient } from "../_shared/supabase.ts";

const ROTATION_HOURS = 24;
const QUOTE_SAMPLE_LIMIT = 10;

serve(async (req) => {
  const context = getRequestContext(req);

  if (req.method === "OPTIONS") {
    return handleOptions(context.origin);
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405, context.origin, {
      "Allow": "POST,OPTIONS",
    });
  }

  const unauthorized = ensureEdgeAuthorized(req, context.origin);
  if (unauthorized) {
    logWarn("rotate-qotd: unauthorized attempt", {
      ipAddress: context.ipAddress,
    });
    return unauthorized;
  }

  try {
    const supabaseAdmin = createServiceClient();

    const { data: currentState, error: stateError } = await supabaseAdmin
      .from("app_state")
      .select("value")
      .eq("key", "quote_of_the_day")
      .maybeSingle();

    if (stateError) {
      logError("rotate-qotd: failed to read app_state", { error: stateError.message });
      return jsonResponse({ error: "STATE_LOOKUP_FAILED" }, 500, context.origin);
    }

    const lastRotated = currentState?.value?.rotated_at;
    const now = new Date();

    if (lastRotated) {
      const hoursSince = (now.getTime() - new Date(lastRotated).getTime()) / (1000 * 60 * 60);
      if (hoursSince < ROTATION_HOURS) {
        logInfo("rotate-qotd: rotation skipped", { hoursSince, lastRotated });
        return jsonResponse({ message: "Quote already rotated today", rotated: false }, 200, context.origin);
      }
    }

    const { data: quotes, error: quotesError } = await supabaseAdmin
      .from("quotes")
      .select("*")
      .order("used_count", { ascending: true })
      .limit(QUOTE_SAMPLE_LIMIT);

    if (quotesError) {
      logError("rotate-qotd: quotes lookup failed", { error: quotesError.message });
      return jsonResponse({ error: "QUOTE_LOOKUP_FAILED" }, 500, context.origin);
    }

    if (!quotes || quotes.length === 0) {
      logWarn("rotate-qotd: no quotes available");
      return jsonResponse({ error: "NO_QUOTES_AVAILABLE" }, 500, context.origin);
    }

    const selectedQuote = quotes[Math.floor(Math.random() * quotes.length)];

    const { error: usageError } = await supabaseAdmin
      .from("quotes")
      .update({ used_count: (selectedQuote.used_count ?? 0) + 1 })
      .eq("id", selectedQuote.id);

    if (usageError) {
      logError("rotate-qotd: failed to update usage", {
        quoteId: selectedQuote.id,
        error: usageError.message,
      });
      return jsonResponse({ error: "USAGE_UPDATE_FAILED" }, 500, context.origin);
    }

    const rotationPayload = {
      quote_id: selectedQuote.id,
      text_en: selectedQuote.text_en,
      text_es: selectedQuote.text_es,
      text_de: selectedQuote.text_de,
      author: selectedQuote.author,
      category: selectedQuote.category,
      rotated_at: now.toISOString(),
    };

    const { error: updateError } = await supabaseAdmin
      .from("app_state")
      .update({
        value: rotationPayload,
        updated_at: now.toISOString(),
      })
      .eq("key", "quote_of_the_day");

    if (updateError) {
      logError("rotate-qotd: failed to update state", { error: updateError.message });
      return jsonResponse({ error: "STATE_UPDATE_FAILED" }, 500, context.origin);
    }

    logInfo("rotate-qotd: rotation completed", {
      quoteId: selectedQuote.id,
      category: selectedQuote.category,
    });

    return jsonResponse({
      message: "Quote rotated successfully",
      rotated: true,
      quote: rotationPayload,
    }, 200, context.origin);
  } catch (error) {
    logError("rotate-qotd: unexpected failure", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: "INTERNAL_ERROR" }, 500, context.origin);
  }
});