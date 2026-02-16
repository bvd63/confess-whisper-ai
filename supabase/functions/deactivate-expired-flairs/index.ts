import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { corsHeaders, jsonResponse, requireInternalSecret } from "../_shared/edge-auth.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  const internal = requireInternalSecret(req);
  if (!internal.ok) return internal.response;

  try {
    console.log('[DEACTIVATE-EXPIRED-FLAIRS] Starting cron job');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the database function to deactivate expired flairs
    const { error: deactivateError } = await supabase.rpc('deactivate_expired_flairs');

    if (deactivateError) {
      console.error('[DEACTIVATE-EXPIRED-FLAIRS] Error:', deactivateError);
      throw deactivateError;
    }

    // Also deactivate expired badges
    const { error: badgesError } = await supabase.rpc('deactivate_expired_perks');

    if (badgesError) {
      console.error('[DEACTIVATE-EXPIRED-FLAIRS] Error deactivating badges:', badgesError);
      throw badgesError;
    }

    console.log('[DEACTIVATE-EXPIRED-FLAIRS] Successfully deactivated expired flairs and badges');

    // Log the cron job execution
    await supabase
      .from('cron_job_logs')
      .insert({
        job_name: 'deactivate-expired-flairs',
        status: 'success',
        details: { message: 'Expired flairs and badges deactivated successfully' }
      });

    return jsonResponse({ success: true, message: 'Expired flairs deactivated' }, 200);
  } catch (error) {
    console.error('[DEACTIVATE-EXPIRED-FLAIRS] Fatal error:', error);
    
    // Log the failure
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    await supabase
      .from('cron_job_logs')
      .insert({
        job_name: 'deactivate-expired-flairs',
        status: 'error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });

    return jsonResponse({ error: error instanceof Error ? error.message : 'Internal server error' }, 500);
  }
});
