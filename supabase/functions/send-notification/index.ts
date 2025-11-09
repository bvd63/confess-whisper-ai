import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ONESIGNAL_APP_ID = Deno.env.get("VITE_ONESIGNAL_APP_ID");
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error("OneSignal credentials not configured");
    }

    const payload: NotificationPayload = await req.json();
    logStep("Received payload", { type: payload.type, userId: payload.userId });

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
      return new Response(
        JSON.stringify({ error: "Recipient not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    if (!recipientProfile.onesignal_player_id) {
      logStep("User does not have OneSignal player ID");
      return new Response(
        JSON.stringify({ message: "User has not enabled push notifications" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

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
        heading = "New Like! 💖";
        message = `${triggeredByName} liked your confession`;
        url = `/confession/${payload.confessionId}`;
        break;
      case "comment":
        heading = "New Comment 💬";
        message = `${triggeredByName}: ${payload.commentContent?.substring(0, 50)}${payload.commentContent && payload.commentContent.length > 50 ? "..." : ""}`;
        url = `/confession/${payload.confessionId}`;
        break;
      case "follow":
        heading = "New Follower! 👥";
        message = `${triggeredByName} started following you`;
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

    logStep("Sending OneSignal notification", { heading, playerId: recipientProfile.onesignal_player_id });

    // Send OneSignal notification
    const oneSignalResponse = await fetch("https://onesignal.com/api/v1/notifications", {
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
    });

    const oneSignalData = await oneSignalResponse.json();

    if (!oneSignalResponse.ok) {
      logStep("OneSignal API error", oneSignalData);
      throw new Error(`OneSignal API error: ${JSON.stringify(oneSignalData)}`);
    }

    logStep("Notification sent successfully", { recipients: oneSignalData.recipients });

    return new Response(
      JSON.stringify({ 
        success: true, 
        recipients: oneSignalData.recipients,
        id: oneSignalData.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
