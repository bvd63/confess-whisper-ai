import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CRON-NIGHT] ${step}${detailsStr}`);
};

serve(async (req) => {
  try {
    logStep("Night notifications cron started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // Get users who have push tokens and notification settings enabled
    const { data: users, error } = await supabase
      .from("user_push_tokens")
      .select(`
        user_id,
        token,
        notification_settings!inner(
          daily_reminder
        )
      `)
      .eq('notification_settings.daily_reminder', true);

    if (error) throw error;

    logStep("Found users with push tokens", { count: users?.length || 0 });

    let successCount = 0;
    let errorCount = 0;

    for (const user of users || []) {
      try {
        // Send push via send-push function
        const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            userId: user.user_id,
            title: "Evening Reflection 🌙",
            body: "Good evening. Reflect on your day before sleep.",
            data: { type: "night_reminder" }
          })
        });

        if (pushResponse.ok) {
          successCount++;
        } else {
          errorCount++;
          logStep("Failed to send push", { userId: user.user_id });
        }
      } catch (err) {
        errorCount++;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        logStep("Error sending to user", { userId: user.user_id, error: errorMsg });
      }
    }

    logStep("Night notifications completed", { successCount, errorCount });

    return new Response(
      JSON.stringify({ 
        success: true, 
        sentTo: successCount,
        failed: errorCount,
        message: `Night notifications sent to ${successCount} users` 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
