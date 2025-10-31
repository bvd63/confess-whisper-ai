import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-PUSH] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { userId, title, body, data, language = 'en' } = await req.json();
    logStep("Request received", { userId, title, language });

    if (!userId || !title || !body) {
      throw new Error("Missing required fields: userId, title, body");
    }

    const ONESIGNAL_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
    const ONESIGNAL_APP_ID = Deno.env.get("VITE_ONESIGNAL_APP_ID");

    if (!ONESIGNAL_KEY || !ONESIGNAL_APP_ID) {
      throw new Error("OneSignal credentials not configured");
    }

    logStep("Sending push notification to OneSignal");

    const oneSignalResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${ONESIGNAL_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: [userId],
        channel_for_external_user_ids: "push",
        headings: { en: title },
        contents: { en: body },
        data: data || {},
      })
    });

    const responseText = await oneSignalResponse.text();
    logStep("OneSignal response", { status: oneSignalResponse.status, body: responseText });

    if (!oneSignalResponse.ok) {
      throw new Error(`OneSignal API error: ${responseText}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Push notification sent" }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
