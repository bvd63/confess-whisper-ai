import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function log(level: string, message: string, context?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  console.log(JSON.stringify(logEntry));
}

serve(async (req) => {
  const requestId = generateRequestId();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log('info', '[ENHANCED-MODERATION] Function started', { requestId });

    // Verify authentication and authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      log('warn', '[ENHANCED-MODERATION] No authorization header', { requestId });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      log('warn', '[ENHANCED-MODERATION] User not authenticated', { requestId });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has moderator or admin role
    const { data: roleData, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    const { data: modRoleData, error: modRoleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'moderator'
    });

    const isAdmin = !roleError && roleData === true;
    const isModerator = !modRoleError && modRoleData === true;

    if (!isAdmin && !isModerator) {
      log('warn', '[ENHANCED-MODERATION] User lacks admin/moderator role', { requestId, userId: user.id });
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin or Moderator role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log('info', '[ENHANCED-MODERATION] User authorized', { requestId, userId: user.id, isAdmin, isModerator });

    const { content, confessionId, language = 'en' } = await req.json();

    if (!content || !confessionId) {
      log('warn', '[ENHANCED-MODERATION] Missing required fields', { requestId });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate inputs
    if (typeof content !== 'string' || content.length > 10000) {
      log('warn', '[ENHANCED-MODERATION] Invalid content length', { requestId, contentLength: content.length });
      return new Response(
        JSON.stringify({ error: 'Content must be a string with max 10000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log('info', '[ENHANCED-MODERATION] Validating confession', { requestId, confessionId });

    // Use service role client for moderation operations
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Call AI moderation
    log('info', '[ENHANCED-MODERATION] Calling AI moderation', { requestId, confessionId });
    const { data: moderationData, error: moderationError } = await serviceClient.functions.invoke(
      'ai-moderation',
      { body: { content, language } }
    );

    if (moderationError) {
      log('error', '[ENHANCED-MODERATION] AI moderation failed', { requestId, error: moderationError.message });
      throw moderationError;
    }

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
      log('info', '[ENHANCED-MODERATION] Content flagged', { requestId, confessionId, level, reason });
      
      await serviceClient.from('moderation_queue').insert({
        confession_id: confessionId,
        content,
        moderation_level: level,
        ai_reason: reason,
        status: level === 'unsafe' ? 'rejected' : 'pending',
      });

      // Update confession status
      await serviceClient
        .from('confessions')
        .update({ 
          moderation_status: level === 'unsafe' ? 'rejected' : 'pending' 
        })
        .eq('id', confessionId);
      
      log('info', '[ENHANCED-MODERATION] Confession status updated', { requestId, confessionId, status: level === 'unsafe' ? 'rejected' : 'pending' });
    } else {
      // Auto-approve safe content
      log('info', '[ENHANCED-MODERATION] Content approved', { requestId, confessionId });
      await serviceClient
        .from('confessions')
        .update({ moderation_status: 'approved' })
        .eq('id', confessionId);
    }

    log('info', '[ENHANCED-MODERATION] Moderation complete', { requestId, confessionId, level });

    return new Response(
      JSON.stringify({
        level,
        reason: level !== 'safe' ? reason : null,
        approved: level === 'safe',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log('error', '[ENHANCED-MODERATION] Error occurred', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
