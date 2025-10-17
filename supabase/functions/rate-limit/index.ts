import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory rate limit store (use Redis in production)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

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

    const config = configs[action] || configs.default;
    const key = `${action}:${userId || ip}`;
    const now = Date.now();

    let rateLimitData = rateLimits.get(key);

    // Reset if window expired
    if (!rateLimitData || now > rateLimitData.resetAt) {
      rateLimitData = {
        count: 1,
        resetAt: now + config.windowMs,
      };
      rateLimits.set(key, rateLimitData);

      return new Response(
        JSON.stringify({
          allowed: true,
          remaining: config.maxAttempts - 1,
          resetAt: rateLimitData.resetAt,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if limit exceeded
    if (rateLimitData.count >= config.maxAttempts) {
      const retryAfter = Math.ceil((rateLimitData.resetAt - now) / 1000);
      
      return new Response(
        JSON.stringify({
          allowed: false,
          remaining: 0,
          resetAt: rateLimitData.resetAt,
          retryAfter,
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
          } 
        }
      );
    }

    // Increment counter
    rateLimitData.count++;
    rateLimits.set(key, rateLimitData);

    return new Response(
      JSON.stringify({
        allowed: true,
        remaining: config.maxAttempts - rateLimitData.count,
        resetAt: rateLimitData.resetAt,
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

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimits.entries()) {
    if (now > data.resetAt + 300000) { // 5 minutes after reset
      rateLimits.delete(key);
    }
  }
}, 300000);
