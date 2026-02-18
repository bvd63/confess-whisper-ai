import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

// Structured logging helper
function log(level: 'info' | 'warn' | 'error', message: string, metadata?: any) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    function: 'health',
    metadata,
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const expectedSecret = Deno.env.get('INTERNAL_JOB_SECRET');
    const providedSecret = req.headers.get('x-internal-secret');

    if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    log('info', 'Health check initiated');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    let dbStatus: 'ok' | 'fail' = 'ok';

    // Check database health
    try {
      const { error: dbError } = await supabaseClient
        .from('profiles')
        .select('id')
        .limit(1);

      if (dbError) {
        log('error', 'Database health check failed', { error: dbError.message });
        dbStatus = 'fail';
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      log('error', 'Database health check exception', { error: errorMsg });
      dbStatus = 'fail';
    }

    const statusCode = dbStatus === 'ok' ? 200 : 503;

    const responseBody = {
      ok: dbStatus === 'ok',
      ts: new Date().toISOString(),
      services: {
        db: dbStatus,
      },
    };

    log('info', 'Health check completed', { 
      status: dbStatus,
      statusCode,
    });

    return new Response(
      JSON.stringify(responseBody),
      { 
        status: statusCode,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        } 
      }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    log('error', 'Health check failed with exception', { error: errorMsg });
    
    return new Response(
      JSON.stringify({ ok: false, ts: new Date().toISOString(), services: { db: 'fail' } }),
      { 
        status: 503, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
