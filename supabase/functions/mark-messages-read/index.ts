import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { logError, logInfo, logWarn } from "../_shared/logger.ts";
import { getRequestContext } from "../_shared/security.ts";
import { createServiceClient, requireAuth } from "../_shared/supabase.ts";

const MarkMessagesSchema = z.object({
  threadId: z.string().min(8, "threadId"),
  messageIds: z.array(z.string().min(8, "messageId")).min(1, "messageIds"),
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
      logWarn("mark-messages-read: unauthorized", { reason: authResult.error });
      return jsonResponse({ error: "UNAUTHORIZED" }, 401, origin);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (parseError) {
      logWarn("mark-messages-read: invalid JSON", {
        userId: authResult.user.id,
        parseError: parseError instanceof Error ? parseError.message : String(parseError),
      });
      return jsonResponse({ error: "INVALID_JSON" }, 400, origin);
    }

    const parsed = MarkMessagesSchema.safeParse(rawBody);
    if (!parsed.success) {
      logWarn("mark-messages-read: invalid payload", {
        userId: authResult.user.id,
        issues: parsed.error.flatten().fieldErrors,
      });
      return jsonResponse({ error: "INVALID_PAYLOAD" }, 400, origin);
    }

    const { threadId, messageIds } = parsed.data;
    const supabase = authResult.client;

    const { data: participant, error: participantError } = await supabase
      .from("conversation_participants")
      .select("id")
      .eq("conversation_id", threadId)
      .eq("user_id", authResult.user.id)
      .maybeSingle();

    if (participantError) {
      logError("mark-messages-read: participant lookup failed", {
        userId: authResult.user.id,
        threadId,
        error: participantError.message,
      });
      return jsonResponse({ error: "PARTICIPANT_LOOKUP_FAILED" }, 500, origin);
    }

    if (!participant) {
      logWarn("mark-messages-read: forbidden", {
        userId: authResult.user.id,
        threadId,
      });
      return jsonResponse({ error: "FORBIDDEN" }, 403, origin);
    }

    const serviceClient = createServiceClient();
    const { error: rpcError } = await serviceClient.rpc("mark_messages_seen", {
      thread_id: threadId,
      message_ids: messageIds,
      user_id: authResult.user.id,
    });

    if (rpcError) {
      logError("mark-messages-read: RPC failed", {
        userId: authResult.user.id,
        threadId,
        error: rpcError.message,
      });
      return jsonResponse({ error: "PERSISTENCE_ERROR" }, 500, origin);
    }

    logInfo("mark-messages-read: messages flagged read", {
      userId: authResult.user.id,
      threadId,
      count: messageIds.length,
      ipAddress,
      userAgent,
    });

    return jsonResponse({ success: true, count: messageIds.length }, 200, origin);
  } catch (error) {
    logError("mark-messages-read: unexpected failure", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: "INTERNAL_ERROR" }, 500, origin);
  }
});