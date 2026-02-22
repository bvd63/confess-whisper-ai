import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  corsHeaders,
  getAuthenticatedRequestContext,
  jsonResponse,
  requireInternalSecret,
} from "../_shared/edge-auth.ts";
import { fetchWithTimeout } from "../_shared/fetch-with-timeout.ts";

const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID") || Deno.env.get("VITE_ONESIGNAL_APP_ID");
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

interface NotificationPayload {
  userId: string;
  type: "like" | "comment" | "follow" | "message";
  triggeredBy: string;
  confessionId?: string;
  commentContent?: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-NOTIFICATION] ${step}${detailsStr}`);
};

// Check for recent similar notifications (for batching)
const checkRecentNotifications = async (
  supabaseClient: any,
  userId: string,
  type: string,
  confessionId: string | undefined,
  minutesWindow: number = 5
): Promise<{ shouldBatch: boolean; count: number }> => {
  const timeAgo = new Date(Date.now() - minutesWindow * 60 * 1000).toISOString();
  
  const { data, error } = await supabaseClient
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", type)
    .gte("created_at", timeAgo);

  if (error) {
    logStep("Error checking recent notifications", { error });
    return { shouldBatch: false, count: 0 };
  }

  // For confession-specific notifications, check if they're for the same confession
  if (confessionId && type !== 'follow' && type !== 'message') {
    const { data: confessionNotifs } = await supabaseClient
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", type)
      .eq("confession_id", confessionId)
      .gte("created_at", timeAgo);
    
    return { 
      shouldBatch: (confessionNotifs?.length || 0) > 0, 
      count: (confessionNotifs?.length || 0) + 1 
    };
  }

  return { shouldBatch: (data?.length || 0) > 0, count: (data?.length || 0) + 1 };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    logStep("Function started");

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error("OneSignal credentials not configured");
    }

    const payload: NotificationPayload = await req.json();
    logStep("Received payload", { type: payload.type, userId: payload.userId });

    const internal = requireInternalSecret(req);
    if (!internal.ok) {
      const auth = await getAuthenticatedRequestContext(req);
      if (!auth.ok) return auth.response;

      // Non-internal callers can only send notifications for themselves.
      if (payload.userId !== auth.context.userId || payload.triggeredBy !== auth.context.userId) {
        return jsonResponse({ error: "FORBIDDEN_USER_MISMATCH" }, 403);
      }
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get recipient's profile and OneSignal player ID
    const { data: recipientProfile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("nickname, onesignal_player_id")
      .eq("user_id", payload.userId)
      .single();

    if (profileError || !recipientProfile) {
      logStep("Recipient profile not found", { error: profileError });
      return jsonResponse({ error: "Recipient not found" }, 404);
    }

    if (!recipientProfile.onesignal_player_id) {
      logStep("User does not have OneSignal player ID");
      return jsonResponse({ message: "User has not enabled push notifications" }, 200);
    }

    // Check user notification preferences
    const { data: notificationSettings } = await supabaseClient
      .from("notification_settings")
      .select("notify_likes, notify_comments, notify_follows, notify_messages")
      .eq("user_id", payload.userId)
      .single();

    // If settings exist, check if this notification type is enabled
    if (notificationSettings) {
      const typePreferenceMap = {
        like: notificationSettings.notify_likes,
        comment: notificationSettings.notify_comments,
        follow: notificationSettings.notify_follows,
        message: notificationSettings.notify_messages,
      };

      const isEnabled = typePreferenceMap[payload.type];
      
      if (isEnabled === false) {
        logStep("User has disabled this notification type", { type: payload.type });
        return jsonResponse({ message: "Notification type disabled by user preferences" }, 200);
      }
    }

    // Check for recent similar notifications (batching)
    const batchCheck = await checkRecentNotifications(
      supabaseClient,
      payload.userId,
      payload.type,
      payload.confessionId,
      5 // 5 minute window
    );

    // Get triggered by user's nickname
    const { data: triggeredByProfile } = await supabaseClient
      .from("profiles")
      .select("nickname")
      .eq("user_id", payload.triggeredBy)
      .single();

    const triggeredByName = triggeredByProfile?.nickname || "Someone";

    // Build notification message based on type
    let heading = "";
    let message = "";
    let url = "";

    switch (payload.type) {
      case "like":
        heading = batchCheck.shouldBatch 
          ? `${batchCheck.count} New Likes! 💖` 
          : "New Like! 💖";
        message = batchCheck.shouldBatch
          ? `${triggeredByName} and ${batchCheck.count - 1} other${batchCheck.count > 2 ? 's' : ''} liked your confession`
          : `${triggeredByName} liked your confession`;
        url = `/confession/${payload.confessionId}`;
        break;
      case "comment":
        heading = batchCheck.shouldBatch
          ? `${batchCheck.count} New Comments 💬`
          : "New Comment 💬";
        message = batchCheck.shouldBatch
          ? `${triggeredByName} and ${batchCheck.count - 1} other${batchCheck.count > 2 ? 's' : ''} commented on your confession`
          : `${triggeredByName}: ${payload.commentContent?.substring(0, 50)}${payload.commentContent && payload.commentContent.length > 50 ? "..." : ""}`;
        url = `/confession/${payload.confessionId}`;
        break;
      case "follow":
        heading = batchCheck.shouldBatch
          ? `${batchCheck.count} New Followers! 👥`
          : "New Follower! 👥";
        message = batchCheck.shouldBatch
          ? `${triggeredByName} and ${batchCheck.count - 1} other${batchCheck.count > 2 ? 's' : ''} followed you`
          : `${triggeredByName} started following you`;
        url = `/profile/${payload.triggeredBy}`;
        break;
      case "message":
        heading = "New Message 📨";
        message = `${triggeredByName} sent you a message`;
        url = "/messages";
        break;
      default:
        throw new Error("Unknown notification type");
    }

    // Skip sending push notification if batching (already sent one recently)
    if (batchCheck.shouldBatch && batchCheck.count > 2) {
      logStep("Skipping push notification due to batching", { count: batchCheck.count });
      return jsonResponse({
        success: true,
        message: "Notification batched, push skipped",
        batched: true,
        count: batchCheck.count,
      }, 200);
    }

    logStep("Sending OneSignal notification", { heading, playerId: recipientProfile.onesignal_player_id });

    // Send OneSignal notification
    const oneSignalResponse = await fetchWithTimeout("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: [recipientProfile.onesignal_player_id],
        headings: { en: heading },
        contents: { en: message },
        url: `${req.headers.get("origin") || ""}${url}`,
        data: {
          type: payload.type,
          confessionId: payload.confessionId,
          triggeredBy: payload.triggeredBy,
        },
      }),
    }, 10_000);

    const oneSignalData = await oneSignalResponse.json();

    if (!oneSignalResponse.ok) {
      logStep("OneSignal API error", oneSignalData);
      throw new Error(`OneSignal API error: ${JSON.stringify(oneSignalData)}`);
    }

    logStep("Notification sent successfully", { recipients: oneSignalData.recipients });

    // Track notification sent event in analytics
    try {
      await supabaseClient.from('analytics_events').insert({
        user_id: payload.userId,
        event_type: 'notification_sent',
        event_data: {
          notification_type: payload.type,
          notificationId: oneSignalData.id,
          triggered_by: payload.triggeredBy,
        },
      });
    } catch (analyticsError) {
      logStep("Failed to track analytics", { error: analyticsError });
      // Don't fail the whole request if analytics fails
    }

    return jsonResponse({
      success: true,
      recipients: oneSignalData.recipients,
      id: oneSignalData.id,
    }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return jsonResponse({ error: errorMessage }, 500);
  }
});
