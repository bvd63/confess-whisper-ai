import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, confessionId, language = 'en' } = await req.json();

    if (!content || !confessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Call AI moderation
    const { data: moderationData, error: moderationError } = await supabaseClient.functions.invoke(
      'ai-moderation',
      { body: { content, language } }
    );

    if (moderationError) throw moderationError;

    const isSafe = moderationData?.is_safe ?? true;
    const reason = moderationData?.reason ?? '';

    // Determine moderation level
    let level: 'safe' | 'borderline' | 'unsafe' = 'safe';
    
    if (!isSafe) {
      const severeKeywords = [
        'kill', 'suicide', 'self-harm', 'murder', 'violence', 'abuse',
        'matar', 'suicidio', 'autolesión', 'violencia', 'abuso',
        'töten', 'selbstmord', 'selbstverletzung', 'gewalt', 'missbrauch'
      ];
      
      const normalizedContent = content.toLowerCase();
      const normalizedReason = reason.toLowerCase();
      
      const hasSevere = severeKeywords.some(kw => 
        normalizedContent.includes(kw) || normalizedReason.includes(kw)
      );
      
      level = hasSevere ? 'unsafe' : 'borderline';
    }

    // Add to moderation queue if flagged
    if (level !== 'safe') {
      await supabaseClient.from('moderation_queue').insert({
        confession_id: confessionId,
        content,
        moderation_level: level,
        ai_reason: reason,
        status: level === 'unsafe' ? 'rejected' : 'pending',
      });

      // Update confession status
      await supabaseClient
        .from('confessions')
        .update({ 
          moderation_status: level === 'unsafe' ? 'rejected' : 'pending' 
        })
        .eq('id', confessionId);
    } else {
      // Auto-approve safe content
      await supabaseClient
        .from('confessions')
        .update({ moderation_status: 'approved' })
        .eq('id', confessionId);
    }

    return new Response(
      JSON.stringify({
        level,
        reason: level !== 'safe' ? reason : null,
        approved: level === 'safe',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Enhanced moderation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
