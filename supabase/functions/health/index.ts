import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: { status: string; latency?: number; error?: string };
    storage: { status: string; latency?: number; error?: string };
    functions: { status: string; error?: string };
  };
  uptime: number;
  memory?: {
    used: number;
    total: number;
    percentage: number;
  };
}

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

const startTime = Date.now();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log('info', 'Health check initiated');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const healthCheck: HealthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.1.0',
      uptime: Date.now() - startTime,
      checks: {
        database: { status: 'unknown' },
        storage: { status: 'unknown' },
        functions: { status: 'healthy' },
      },
    };

    // Check database health
    try {
      const dbStart = Date.now();
      const { error: dbError } = await supabaseClient
        .from('profiles')
        .select('id')
        .limit(1);
      
      const dbLatency = Date.now() - dbStart;
      
      if (dbError) {
        log('error', 'Database health check failed', { error: dbError.message });
        healthCheck.checks.database = {
          status: 'unhealthy',
          error: dbError.message,
        };
        healthCheck.status = 'degraded';
      } else {
        log('info', 'Database health check passed', { latency: dbLatency });
        healthCheck.checks.database = {
          status: 'healthy',
          latency: dbLatency,
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      log('error', 'Database health check exception', { error: errorMsg });
      healthCheck.checks.database = {
        status: 'unhealthy',
        error: errorMsg,
      };
      healthCheck.status = 'unhealthy';
    }

    // Check storage health
    try {
      const storageStart = Date.now();
      const { data: buckets, error: storageError } = await supabaseClient
        .storage
        .listBuckets();
      
      const storageLatency = Date.now() - storageStart;
      
      if (storageError) {
        healthCheck.checks.storage = {
          status: 'degraded',
          error: storageError.message,
        };
        if (healthCheck.status === 'healthy') {
          healthCheck.status = 'degraded';
        }
      } else {
        healthCheck.checks.storage = {
          status: 'healthy',
          latency: storageLatency,
        };
      }
    } catch (error) {
      healthCheck.checks.storage = {
        status: 'degraded',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      if (healthCheck.status === 'healthy') {
        healthCheck.status = 'degraded';
      }
    }

    // Add memory info if available
    if (typeof Deno.memoryUsage === 'function') {
      const memory = Deno.memoryUsage();
      healthCheck.memory = {
        used: memory.heapUsed,
        total: memory.heapTotal,
        percentage: (memory.heapUsed / memory.heapTotal) * 100,
      };
    }

    const statusCode = healthCheck.status === 'healthy' ? 200 
      : healthCheck.status === 'degraded' ? 200 
      : 503;

    log('info', 'Health check completed', { 
      status: healthCheck.status,
      statusCode,
      latencies: {
        database: healthCheck.checks.database.latency,
        storage: healthCheck.checks.storage.latency,
      }
    });

    return new Response(
      JSON.stringify(healthCheck, null, 2),
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
      JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        status: 503, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
