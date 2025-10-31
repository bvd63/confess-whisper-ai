import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CRON-STREAK] ${step}${detailsStr}`);
};

serve(async (req) => {
  try {
    logStep("Streak check cron started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // Get users with active streaks who haven't posted today
    const { data: streaks, error } = await supabase
      .from("user_streaks")
      .select(`
        user_id,
        current_streak,
        last_confession_date
      `)
      .gte('current_streak', 3) // Only notify users with 3+ day streaks
      .lt('last_confession_date', new Date().toISOString().split('T')[0]); // Haven't posted today

    if (error) throw error;

    logStep("Found users at risk of losing streak", { count: streaks?.length || 0 });

    // Get push tokens for these users with notification settings
    const userIds = streaks?.map(s => s.user_id) || [];
    
    if (userIds.length === 0) {
      logStep("No users at risk");
      return new Response(
        JSON.stringify({ success: true, message: "No streak warnings needed" }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const { data: users, error: tokensError } = await supabase
      .from("user_push_tokens")
      .select(`
        user_id,
        token,
        notification_settings!inner(
          streak_alerts
        )
      `)
      .in('user_id', userIds)
      .eq('notification_settings.streak_alerts', true);

    if (tokensError) throw tokensError;

    let successCount = 0;
    let errorCount = 0;

    for (const user of users || []) {
      try {
        const userStreak = streaks?.find(s => s.user_id === user.user_id);
        
        const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            userId: user.user_id,
            title: "Don't Break Your Streak! 🔥",
            body: `You have a ${userStreak?.current_streak}-day streak. Keep it going!`,
            data: { type: "streak_warning", streak: userStreak?.current_streak }
          })
        });

        if (pushResponse.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (err) {
        errorCount++;
        logStep("Error sending to user", { userId: user.user_id });
      }
    }

    logStep("Streak notifications completed", { successCount, errorCount });

    return new Response(
      JSON.stringify({ 
        success: true, 
        sentTo: successCount,
        failed: errorCount,
        message: `Streak warnings sent to ${successCount} users` 
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
