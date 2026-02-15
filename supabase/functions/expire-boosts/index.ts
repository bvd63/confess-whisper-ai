import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Call the expire function
    const { error } = await supabaseAdmin.rpc('expire_active_boosts');

    if (error) {
      console.error('Error expiring boosts:', error);
      return jsonResponse({ error: 'Failed to expire boosts', details: error.message }, 500);
    }

    console.log('Successfully expired active boosts');
    return jsonResponse({ success: true, message: 'Boosts expired successfully' }, 200);

  } catch (error) {
    console.error('Error in expire-boosts:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});