import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Hard delete notifications older than 30 days
    const { error: notifError } = await supabaseAdmin
      .from('notifications')
      .delete()
      .lt('deleted_at', thirtyDaysAgo.toISOString())
      .not('deleted_at', 'is', null);

    if (notifError) {
      console.error('Error deleting notifications:', notifError);
    }

    // Clean up old drafts (older than 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { error: draftError } = await supabaseAdmin
      .from('confession_drafts')
      .delete()
      .lt('updated_at', ninetyDaysAgo.toISOString());

    if (draftError) {
      console.error('Error deleting drafts:', draftError);
    }

    console.log('Cleanup complete');

    return jsonResponse({
      success: true,
      message: 'Cleanup completed successfully',
    }, 200);

  } catch (error) {
    console.error('Cleanup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: errorMessage }, 500);
  }
});