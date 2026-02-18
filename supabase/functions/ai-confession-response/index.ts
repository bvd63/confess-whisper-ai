import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getAuthenticatedRequestContext } from "../_shared/edge-auth.ts";
import { resolveServerAiAccess } from "./utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Payload = {
  userId?: string;
  confessionId?: string;
  text: string;
  isVip?: boolean;
  tier?: string;
  locale?: 'en' | 'es' | 'de';
};

interface RateLimitResponse {
  allowed?: boolean;
  remaining?: number;
  retryAfter?: number;
  resetAt?: string;
  identifierType?: 'user' | 'ip';
}

const systemPrompts = {
  en: "You are ConfessAI – empathetic, concise, helpful. Offer a humane, supportive view in 2-3 short paragraphs.",
  es: "Eres ConfessAI: empático, conciso y útil. Ofrece una perspectiva humana y de apoyo en 2-3 párrafos cortos.",
  de: "Du bist ConfessAI: empathisch, prägnant und hilfsbereit. Gib eine menschliche, unterstützende Sicht in 2-3 kurzen Absätzen."
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AI-CONFESSION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authContext = await getAuthenticatedRequestContext(req);
    if (!authContext.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Supabase configuration is missing");
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body = await req.json() as Payload;
    const locale = body.locale ?? 'en';
    const sys = systemPrompts[locale] ?? systemPrompts.en;

    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('subscription_tier, is_premium, trial_active, trial_premium_ends_at')
      .eq('user_id', authContext.context.userId)
      .maybeSingle();

    if (profileError) {
      logStep("Profile lookup failed", { error: profileError.message });
      throw new Error("Profile lookup failed");
    }

    const subscriptionTier = (profile?.subscription_tier ?? 'free').toLowerCase();
    const { isVipServer, model, rateLimitAction } = resolveServerAiAccess(profile, body.isVip);
    const authHeader = req.headers.get('Authorization') ?? '';
    const rateLimitResult = await serviceClient.functions.invoke<RateLimitResponse>('rate-limit', {
      body: {
        action: rateLimitAction,
        ip: clientIp,
      },
      headers: {
        Authorization: authHeader,
      },
    });

    if (!rateLimitResult.error && rateLimitResult.data?.allowed === false) {
      const responseHeaders: Record<string, string> = {
        ...corsHeaders,
        'Content-Type': 'application/json',
      };

      if (rateLimitResult.data.retryAfter) {
        responseHeaders['Retry-After'] = rateLimitResult.data.retryAfter.toString();
      }

      return new Response(
        JSON.stringify({ ok: false, error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: responseHeaders }
      );
    }

    if (rateLimitResult.error) {
      const errorContext = (rateLimitResult.error as { context?: unknown })?.context;
      const status = (errorContext as { status?: number })?.status;
      if (status === 429) {
        const retryAfter =
          errorContext instanceof Response
            ? errorContext.headers.get('Retry-After')
            : null;

        const responseHeaders: Record<string, string> = {
          ...corsHeaders,
          'Content-Type': 'application/json',
        };

        if (retryAfter) {
          responseHeaders['Retry-After'] = retryAfter;
        }

        return new Response(
          JSON.stringify({ ok: false, error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: responseHeaders }
        );
      }
      logStep("Rate limit invocation failed", { error: rateLimitResult.error.message ?? String(rateLimitResult.error) });
      return new Response(
        JSON.stringify({ ok: false, error: "Rate limit unavailable. Please try again." }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    logStep("Request received", { 
      userId: authContext.context.userId,
      confessionId: body.confessionId,
      clientIsVip: body.isVip,
      isVipServer,
      tier: subscriptionTier,
      locale,
      textLength: body.text?.length 
    });

    logStep("Calling AI", { model, isVip: isVipServer });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: body.text }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("AI API error", { status: response.status, error: errorText });
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ ok: false, error: "Rate limit exceeded. Please try again later." }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ ok: false, error: "AI credits exhausted. Please contact support." }), 
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content ?? "I understand what you've shared. Thank you for confiding in me.";

    logStep("AI response generated", { answerLength: answer.length });

    return new Response(
      JSON.stringify({ ok: true, answer }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    logStep("ERROR", { error: errorMessage });
    
    return new Response(
      JSON.stringify({ ok: false, error: errorMessage }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
