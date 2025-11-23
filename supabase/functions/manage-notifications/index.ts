import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { logError, logInfo, logWarn } from "../_shared/logger.ts";
import { getRequestContext } from "../_shared/security.ts";
import { requireAuth } from "../_shared/supabase.ts";

const NotificationPayloadSchema = z.object({
  action: z.enum(["mark_read", "mark_all_read", "delete", "delete_all"]),
  notificationId: z.string().uuid().optional(),
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
      logWarn("manage-notifications: invalid JSON", { userId: authResult.user.id, parseError });
      return jsonResponse({ error: "INVALID_JSON" }, 400, origin);
    }

    const parsed = NotificationPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      logWarn("manage-notifications: invalid payload", {
        userId: authResult.user.id,
        issues: parsed.error.flatten().fieldErrors,
      });
      return jsonResponse({ error: "INVALID_PAYLOAD" }, 400, origin);
    }

    const payload = parsed.data;
    const supabase = authResult.client;
    const userId = authResult.user.id;

    if (payload.action === "mark_read") {
      if (!payload.notificationId) {
        return jsonResponse({ error: "NOTIFICATION_REQUIRED" }, 400, origin);
      }

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", payload.notificationId)
        .eq("user_id", userId);

      if (error) {
        logError("manage-notifications: failed to mark read", { error: error.message, userId });
        return jsonResponse({ error: "PERSISTENCE_ERROR" }, 500, origin);
      }
    } else if (payload.action === "mark_all_read") {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) {
        logError("manage-notifications: failed to mark all read", { error: error.message, userId });
        return jsonResponse({ error: "PERSISTENCE_ERROR" }, 500, origin);
      }
    } else if (payload.action === "delete") {
      if (!payload.notificationId) {
        return jsonResponse({ error: "NOTIFICATION_REQUIRED" }, 400, origin);
      }

      const { data: notification, error: fetchError } = await supabase
        .from("notifications")
        .select("deleted_for")
        .eq("id", payload.notificationId)
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchError) {
        logError("manage-notifications: fetch failed", { error: fetchError.message, userId });
        return jsonResponse({ error: "PERSISTENCE_ERROR" }, 500, origin);
      }

      const deletedFor = notification?.deleted_for ?? [];
      if (!deletedFor.includes(userId)) {
        deletedFor.push(userId);
      }

      const { error: deleteError } = await supabase
        .from("notifications")
        .update({ deleted_for: deletedFor })
        .eq("id", payload.notificationId)
        .eq("user_id", userId);

      if (deleteError) {
        logError("manage-notifications: delete failed", { error: deleteError.message, userId });
        return jsonResponse({ error: "PERSISTENCE_ERROR" }, 500, origin);
      }
    } else if (payload.action === "delete_all") {
      const { data: notifications, error: fetchError } = await supabase
        .from("notifications")
        .select("id, deleted_for")
        .eq("user_id", userId);

      if (fetchError) {
        logError("manage-notifications: delete_all fetch failed", { error: fetchError.message, userId });
        return jsonResponse({ error: "PERSISTENCE_ERROR" }, 500, origin);
      }

      if (notifications?.length) {
        for (const notification of notifications) {
          const deletedFor = notification.deleted_for ?? [];
          if (deletedFor.includes(userId)) {
            continue;
          }
          deletedFor.push(userId);
          const { error } = await supabase
            .from("notifications")
            .update({ deleted_for: deletedFor })
            .eq("id", notification.id);

          if (error) {
            logError("manage-notifications: delete_all update failed", { error: error.message, userId });
            return jsonResponse({ error: "PERSISTENCE_ERROR" }, 500, origin);
          }
        }
      }
    }

    logInfo("manage-notifications: action completed", {
      action: payload.action,
      notificationId: payload.notificationId,
      userId,
      ipAddress,
      userAgent,
    });

    return jsonResponse({ success: true }, 200, origin);
  } catch (error) {
    logError("manage-notifications: unexpected error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: "INTERNAL_ERROR" }, 500, req.headers.get("origin"));
  }
});