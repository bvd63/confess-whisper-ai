import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getServerEnv } from "../_shared/env.ts";
import { jsonResponse, handleOptions } from "../_shared/http.ts";
import { logError, logInfo, logWarn } from "../_shared/logger.ts";
import { createServiceClient, requireAuth } from "../_shared/supabase.ts";

const NotificationPayloadSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(["like", "comment", "follow", "message"]),
  triggeredBy: z.string().uuid(),
  confessionId: z.string().uuid().optional(),
  commentContent: z.string().max(500).optional(),
});

type NotificationPayload = z.infer<typeof NotificationPayloadSchema>;

const checkRecentNotifications = async (
  supabaseClient: ReturnType<typeof createServiceClient>,
  userId: string,
  type: NotificationPayload["type"],
  confessionId: string | undefined,
  minutesWindow = 5,
) => {
  const timeAgo = new Date(Date.now() - minutesWindow * 60 * 1000).toISOString();

  const { data, error } = await supabaseClient
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", type)
    .gte("created_at", timeAgo);

  if (error) {
    logWarn("Recent notification lookup failed", { error: error.message });
    return { shouldBatch: false, count: 1 } as const;
  }

  if (confessionId && type !== "follow" && type !== "message") {
    const { data: confessionNotifs } = await supabaseClient
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", type)
      .eq("confession_id", confessionId)
      .gte("created_at", timeAgo);

    const count = (confessionNotifs?.length ?? 0) + 1;
    return { shouldBatch: count > 1, count } as const;
  }

  const count = (data?.length ?? 0) + 1;
  return { shouldBatch: count > 1, count } as const;
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return handleOptions(origin);
  }

  try {
    const env = getServerEnv();
    const authHeader = req.headers.get("Authorization");
    const authResult = await requireAuth(authHeader);
    if (!authResult.user) {
      return jsonResponse({ error: "UNAUTHORIZED" }, 401, origin);
    }

    const body = await req.json();
    const parsed = NotificationPayloadSchema.safeParse(body);
    if (!parsed.success) {
      logWarn("Invalid notification payload", { issues: parsed.error.flatten().fieldErrors });
      return jsonResponse({ error: "INVALID_PAYLOAD" }, 400, origin);
    }

    const payload = parsed.data;
    if (payload.triggeredBy !== authResult.user.id) {
      return jsonResponse({ error: "FORBIDDEN" }, 403, origin);
    }

    const supabaseClient = createServiceClient();

    const { data: recipientProfile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("nickname, onesignal_player_id")
      .eq("user_id", payload.userId)
      .single();

    if (profileError || !recipientProfile) {
      return jsonResponse({ error: "RECIPIENT_NOT_FOUND" }, 404, origin);
    }

    if (!recipientProfile.onesignal_player_id) {
      return jsonResponse({ message: "User has not enabled push notifications" }, 200, origin);
    }

    const { data: notificationSettings } = await supabaseClient
      .from("notification_settings")
      .select("notify_likes, notify_comments, notify_follows, notify_messages")
      .eq("user_id", payload.userId)
      .single();

    if (notificationSettings) {
      const typePreferenceMap = {
        like: notificationSettings.notify_likes,
        comment: notificationSettings.notify_comments,
        follow: notificationSettings.notify_follows,
        message: notificationSettings.notify_messages,
      } as const;

      if (typePreferenceMap[payload.type] === false) {
        return jsonResponse({ message: "Notification type disabled by user preferences" }, 200, origin);
      }
    }

    const batchCheck = await checkRecentNotifications(
      supabaseClient,
      payload.userId,
      payload.type,
      payload.confessionId,
      5,
    );

    const { data: triggeredByProfile } = await supabaseClient
      .from("profiles")
      .select("nickname")
      .eq("user_id", payload.triggeredBy)
      .single();

    const triggeredByName = triggeredByProfile?.nickname ?? "Someone";

    let heading = "";
    let message = "";
    let url = "";

    switch (payload.type) {
      case "like":
        heading = batchCheck.shouldBatch
          ? `${batchCheck.count} New Likes! 💖`
          : "New Like! 💖";
        message = batchCheck.shouldBatch
          ? `${triggeredByName} and ${batchCheck.count - 1} other${batchCheck.count > 2 ? "s" : ""} liked your confession`
          : `${triggeredByName} liked your confession`;
        url = `/confession/${payload.confessionId ?? ""}`;
        break;
      case "comment":
        heading = batchCheck.shouldBatch
          ? `${batchCheck.count} New Comments 💬`
          : "New Comment 💬";
        message = batchCheck.shouldBatch
          ? `${triggeredByName} and ${batchCheck.count - 1} other${batchCheck.count > 2 ? "s" : ""} commented on your confession`
          : `${triggeredByName}: ${payload.commentContent?.substring(0, 50) ?? "commented"}`;
        url = `/confession/${payload.confessionId ?? ""}`;
        break;
      case "follow":
        heading = batchCheck.shouldBatch
          ? `${batchCheck.count} New Followers! 👥`
          : "New Follower! 👥";
        message = batchCheck.shouldBatch
          ? `${triggeredByName} and ${batchCheck.count - 1} other${batchCheck.count > 2 ? "s" : ""} followed you`
          : `${triggeredByName} started following you`;
        url = `/profile/${payload.triggeredBy}`;
        break;
      case "message":
        heading = "New Message 📨";
        message = `${triggeredByName} sent you a message`;
        url = "/messages";
        break;
    }

    if (batchCheck.shouldBatch && batchCheck.count > 2) {
      logInfo("Notification batched, skipping push", { type: payload.type, count: batchCheck.count });
      return jsonResponse({ success: true, batched: true, count: batchCheck.count }, 200, origin);
    }

    const oneSignalResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: env.VITE_ONESIGNAL_APP_ID,
        include_player_ids: [recipientProfile.onesignal_player_id],
        headings: { en: heading },
        contents: { en: message },
        url: `${origin ?? ""}${url}`,
        data: {
          type: payload.type,
          confessionId: payload.confessionId,
          triggeredBy: payload.triggeredBy,
        },
      }),
    });

    const oneSignalData = await oneSignalResponse.json();

    if (!oneSignalResponse.ok) {
      logError("OneSignal API error", { response: oneSignalData });
      return jsonResponse({ error: "ONESIGNAL_ERROR" }, 502, origin);
    }

    try {
      await supabaseClient.from("analytics_events").insert({
        user_id: payload.userId,
        event_type: "notification_sent",
        event_data: {
          notification_type: payload.type,
          notificationId: oneSignalData.id,
          triggered_by: payload.triggeredBy,
        },
      });
    } catch (analyticsError) {
      logWarn("Analytics insert failed", { error: (analyticsError as Error).message });
    }

    return jsonResponse({ success: true, recipients: oneSignalData.recipients, id: oneSignalData.id }, 200, origin);
  } catch (error) {
    logError("send-notification failed", { error: error instanceof Error ? error.message : String(error) });
    return jsonResponse({ error: "INTERNAL_ERROR" }, 500, req.headers.get("origin"));
  }
});
