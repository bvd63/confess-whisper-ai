import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

const configs: Record<string, RateLimitConfig> = {
  confession_create: { maxAttempts: 10, windowMs: 60000 }, // 10 per minute
  comment_create: { maxAttempts: 20, windowMs: 60000 }, // 20 per minute
  message_send: { maxAttempts: 30, windowMs: 60000 }, // 30 per minute
  ai_request: { maxAttempts: 5, windowMs: 60000 }, // 5 per minute
  default: { maxAttempts: 50, windowMs: 60000 }, // 50 per minute
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, ip } = await req.json();
    
    if (!action || (!userId && !ip)) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role for database access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const config = configs[action] || configs.default;
    const key = `${action}:${userId || ip}`;
    const now = new Date();
    const resetAt = new Date(now.getTime() + config.windowMs);

    // Try to get existing rate limit from database
    const { data: existing, error: fetchError } = await supabaseClient
      .from('rate_limits')
      .select('*')
      .eq('key', key)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching rate limit:', fetchError);
      // On error, allow the request (fail open)
      return new Response(
        JSON.stringify({ allowed: true, error: 'Rate limit check failed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if rate limit exists and is still valid
    if (existing && new Date(existing.reset_at) > now) {
      // Check if limit exceeded
      if (existing.count >= config.maxAttempts) {
        const retryAfter = Math.ceil((new Date(existing.reset_at).getTime() - now.getTime()) / 1000);
        
        return new Response(
          JSON.stringify({
            allowed: false,
            remaining: 0,
            resetAt: existing.reset_at,
            retryAfter,
            message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          }),
          { 
            status: 429, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': config.maxAttempts.toString(),
              'X-RateLimit-Remaining': '0',
            } 
          }
        );
      }

      // Increment count
      const newCount = existing.count + 1;
      const { error: updateError } = await supabaseClient
        .from('rate_limits')
        .update({ count: newCount })
        .eq('key', key);

      if (updateError) {
        console.error('Error updating rate limit:', updateError);
      }

      return new Response(
        JSON.stringify({
          allowed: true,
          remaining: config.maxAttempts - newCount,
          resetAt: existing.reset_at,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new rate limit entry or reset expired one
    const { error: upsertError } = await supabaseClient
      .from('rate_limits')
      .upsert({
        key,
        count: 1,
        reset_at: resetAt.toISOString(),
      });

    if (upsertError) {
      console.error('Error creating rate limit:', upsertError);
      // On error, allow the request (fail open)
      return new Response(
        JSON.stringify({ allowed: true, error: 'Rate limit creation failed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        allowed: true,
        remaining: config.maxAttempts - 1,
        resetAt: resetAt.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Rate limit error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
