import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { logError, logInfo, logWarn } from "../_shared/logger.ts";
import { getRequestContext } from "../_shared/security.ts";
import { requireAuth } from "../_shared/supabase.ts";

const MessageDeliveredSchema = z.object({
  messageId: z.string().min(8, "messageId"),
});

serve(async (req) => {
  const { origin, ipAddress, userAgent } = getRequestContext(req);

  if (req.method === "OPTIONS") {
    return handleOptions(origin);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const authResult = await requireAuth(authHeader);

    if (!authResult.user || !authResult.client) {
      logWarn("mark-message-delivered: unauthorized", { reason: authResult.error });
      return jsonResponse({ error: "UNAUTHORIZED" }, 401, origin);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (parseError) {
      logWarn("mark-message-delivered: invalid JSON", {
        userId: authResult.user.id,
        parseError: parseError instanceof Error ? parseError.message : String(parseError),
      });
      return jsonResponse({ error: "INVALID_JSON" }, 400, origin);
    }

    const parsed = MessageDeliveredSchema.safeParse(rawBody);
    if (!parsed.success) {
      logWarn("mark-message-delivered: invalid payload", {
        userId: authResult.user.id,
        issues: parsed.error.flatten().fieldErrors,
      });
      return jsonResponse({ error: "INVALID_PAYLOAD" }, 400, origin);
    }

    const { messageId } = parsed.data;
    const supabase = authResult.client;

    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("id, conversation_id, delivered_at")
      .eq("id", messageId)
      .single();

    if (messageError || !message) {
      logWarn("mark-message-delivered: message not found", {
        userId: authResult.user.id,
        messageId,
        error: messageError?.message,
      });
      return jsonResponse({ error: "MESSAGE_NOT_FOUND" }, 404, origin);
    }

    const { data: participant, error: participantError } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", message.conversation_id)
      .eq("user_id", authResult.user.id)
      .maybeSingle();

    if (participantError) {
      logError("mark-message-delivered: participant lookup failed", {
        userId: authResult.user.id,
        messageId,
        error: participantError.message,
      });
      return jsonResponse({ error: "PARTICIPANT_LOOKUP_FAILED" }, 500, origin);
    }

    if (!participant) {
      logWarn("mark-message-delivered: forbidden", {
        userId: authResult.user.id,
        conversationId: message.conversation_id,
      });
      return jsonResponse({ error: "FORBIDDEN" }, 403, origin);
    }

    const timestamp = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("messages")
      .update({ delivered_at: timestamp })
      .eq("id", messageId)
      .is("delivered_at", null)
      .select("id, delivered_at, seen_at, conversation_id")
      .single();

    if (updateError) {
      logError("mark-message-delivered: update failed", {
        userId: authResult.user.id,
        messageId,
        error: updateError.message,
      });
      return jsonResponse({ error: "PERSISTENCE_ERROR" }, 500, origin);
    }

    logInfo("mark-message-delivered: message flagged delivered", {
      messageId,
      userId: authResult.user.id,
      ipAddress,
      userAgent,
    });

    return jsonResponse({ success: true, message: updated }, 200, origin);
  } catch (error) {
    logError("mark-message-delivered: unexpected failure", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: "INTERNAL_ERROR" }, 500, origin);
  }
});
