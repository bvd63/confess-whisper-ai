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
    log('info', '[ANALYTICS-EVENT] Function started', { requestId });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      log('warn', '[ANALYTICS-EVENT] No authorization header', { requestId });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      log('warn', '[ANALYTICS-EVENT] User not authenticated', { requestId });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    log('info', '[ANALYTICS-EVENT] User authenticated', { requestId, userId: user.id });

    const { event_type, event_data } = await req.json();

    if (!event_type) {
      log('warn', '[ANALYTICS-EVENT] Missing event_type', { requestId, userId: user.id });
      return new Response(
        JSON.stringify({ error: 'event_type is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate event_type is a string with reasonable length
    if (typeof event_type !== 'string' || event_type.length > 100) {
      log('warn', '[ANALYTICS-EVENT] Invalid event_type', { requestId, userId: user.id, event_type });
      return new Response(
        JSON.stringify({ error: 'Invalid event_type format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { error } = await supabaseClient
      .from('analytics_events')
      .insert({
        user_id: user.id,
        event_type,
        event_data: event_data || {},
      });

    if (error) {
      log('error', '[ANALYTICS-EVENT] Database insert failed', { 
        requestId, 
        userId: user.id, 
        error: error.message 
      });
      throw error;
    }

    log('info', '[ANALYTICS-EVENT] Event recorded successfully', { 
      requestId, 
      userId: user.id, 
      event_type 
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log('error', '[ANALYTICS-EVENT] Error occurred', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});