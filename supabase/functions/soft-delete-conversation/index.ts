import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { logError, logInfo, logWarn } from "../_shared/logger.ts";
import { getRequestContext } from "../_shared/security.ts";
import { requireAuth } from "../_shared/supabase.ts";

const SoftDeleteSchema = z.object({
  conversationId: z.string().min(8, "conversationId").max(64, "conversationId"),
});

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

  try {
    const authHeader = req.headers.get("Authorization");
    const authResult = await requireAuth(authHeader);
    if (!authResult.user || !authResult.client) {
      logWarn("soft-delete-conversation: unauthorized", { reason: authResult.error });
      return jsonResponse({ error: "UNAUTHORIZED" }, 401, context.origin);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (parseError) {
      logWarn("soft-delete-conversation: invalid JSON", {
        userId: authResult.user.id,
        error: parseError instanceof Error ? parseError.message : String(parseError),
      });
      return jsonResponse({ error: "INVALID_JSON" }, 400, context.origin);
    }

    const parsed = SoftDeleteSchema.safeParse(rawBody);
    if (!parsed.success) {
      logWarn("soft-delete-conversation: invalid payload", {
        userId: authResult.user.id,
        issues: parsed.error.flatten().fieldErrors,
      });
      return jsonResponse({ error: "INVALID_PAYLOAD" }, 400, context.origin);
    }

    const { conversationId } = parsed.data;
    const supabase = authResult.client;

    const { data: participant, error: participantError } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .eq("user_id", authResult.user.id)
      .maybeSingle();

    if (participantError) {
      logError("soft-delete-conversation: participant lookup failed", {
        userId: authResult.user.id,
        conversationId,
        error: participantError.message,
      });
      return jsonResponse({ error: "PARTICIPANT_LOOKUP_FAILED" }, 500, context.origin);
    }

    if (!participant) {
      logWarn("soft-delete-conversation: forbidden", {
        userId: authResult.user.id,
        conversationId,
      });
      return jsonResponse({ error: "FORBIDDEN" }, 403, context.origin);
    }

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("deleted_for")
      .eq("id", conversationId)
      .maybeSingle();

    if (conversationError) {
      logError("soft-delete-conversation: conversation lookup failed", {
        userId: authResult.user.id,
        conversationId,
        error: conversationError.message,
      });
      return jsonResponse({ error: "CONVERSATION_LOOKUP_FAILED" }, 500, context.origin);
    }

    if (!conversation) {
      return jsonResponse({ error: "CONVERSATION_NOT_FOUND" }, 404, context.origin);
    }

    const deletedFor = new Set<string>(conversation.deleted_for ?? []);
    deletedFor.add(authResult.user.id);

    const { error: updateError } = await supabase
      .from("conversations")
      .update({ deleted_for: Array.from(deletedFor) })
      .eq("id", conversationId);

    if (updateError) {
      logError("soft-delete-conversation: update failed", {
        userId: authResult.user.id,
        conversationId,
        error: updateError.message,
      });
      return jsonResponse({ error: "PERSISTENCE_ERROR" }, 500, context.origin);
    }

    logInfo("soft-delete-conversation: conversation flagged", {
      userId: authResult.user.id,
      conversationId,
      ipAddress: context.ipAddress,
    });

    return jsonResponse({ success: true }, 200, context.origin);
  } catch (error) {
    logError("soft-delete-conversation: unexpected failure", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: "INTERNAL_ERROR" }, 500, context.origin);
  }
});