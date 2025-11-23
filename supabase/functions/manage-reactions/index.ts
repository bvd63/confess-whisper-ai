import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { logError, logInfo, logWarn } from "../_shared/logger.ts";
import { getRequestContext } from "../_shared/security.ts";
import { requireAuth } from "../_shared/supabase.ts";

const ReactionPayloadSchema = z.object({
  messageId: z.string().min(8, "messageId"),
  emoji: z.string().min(1).max(16),
  action: z.enum(["add", "remove"]),
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
      return jsonResponse({ error: "UNAUTHORIZED" }, 401, origin);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (parseError) {
      logWarn("manage-reactions: invalid JSON", { userId: authResult.user.id, parseError });
      return jsonResponse({ error: "INVALID_JSON" }, 400, origin);
    }

    const parsed = ReactionPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      logWarn("manage-reactions: invalid payload", {
        userId: authResult.user.id,
        issues: parsed.error.flatten().fieldErrors,
      });
      return jsonResponse({ error: "INVALID_PAYLOAD" }, 400, origin);
    }

    const payload = parsed.data;
    const supabase = authResult.client;
    const { data: message, error: fetchError } = await supabase
      .from("messages")
      .select("reactions, conversation_id")
      .eq("id", payload.messageId)
      .single();

    if (fetchError || !message) {
      return jsonResponse({ error: "MESSAGE_NOT_FOUND" }, 404, origin);
    }

    const { data: participant } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", message.conversation_id)
      .eq("user_id", authResult.user.id)
      .maybeSingle();

    if (!participant) {
      logWarn("manage-reactions: unauthorized conversation access", {
        userId: authResult.user.id,
        conversationId: message.conversation_id,
      });
      return jsonResponse({ error: "FORBIDDEN" }, 403, origin);
    }

    const reactions = (message.reactions || []) as Array<{
      userId: string;
      emoji: string;
      createdAt: string;
    }>;

    let updatedReactions: typeof reactions;
    if (payload.action === "add") {
      updatedReactions = reactions.filter((reaction) => !(reaction.userId === authResult.user.id && reaction.emoji === payload.emoji));
      updatedReactions.push({
        userId: authResult.user.id,
        emoji: payload.emoji,
        createdAt: new Date().toISOString(),
      });
    } else {
      updatedReactions = reactions.filter((reaction) => !(reaction.userId === authResult.user.id && reaction.emoji === payload.emoji));
    }

    const { error: updateError } = await supabase
      .from("messages")
      .update({ reactions: updatedReactions })
      .eq("id", payload.messageId);

    if (updateError) {
      logError("manage-reactions: failed to persist reactions", {
        userId: authResult.user.id,
        messageId: payload.messageId,
        error: updateError.message,
      });
      return jsonResponse({ error: "PERSISTENCE_ERROR" }, 500, origin);
    }

    logInfo("manage-reactions: reaction updated", {
      action: payload.action,
      emoji: payload.emoji,
      messageId: payload.messageId,
      userId: authResult.user.id,
      ipAddress,
      userAgent,
    });

    return jsonResponse({ success: true, reactions: updatedReactions }, 200, origin);
  } catch (error) {
    logError("manage-reactions: unexpected error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: "INTERNAL_ERROR" }, 500, req.headers.get("origin"));
  }
});