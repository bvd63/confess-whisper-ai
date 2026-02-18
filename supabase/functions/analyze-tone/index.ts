import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, getAuthenticatedRequestContext, jsonResponse } from '../_shared/edge-auth.ts';

interface RateLimitResponse {
  allowed?: boolean;
  retryAfter?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const auth = await getAuthenticatedRequestContext(req);
    if (!auth.ok) return auth.response;

    const { content, confessionId } = await req.json();
    
    if (!content) {
      return jsonResponse({ error: 'Content is required' }, 400);
    }

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Supabase service role configuration missing for rate limit check');
      return jsonResponse({ error: 'Rate limit unavailable. Please try again.' }, 503);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const rateLimitClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const rateLimitResult = await rateLimitClient.functions.invoke<RateLimitResponse>('rate-limit', {
      body: { action: 'ai_request', ip: clientIp },
      headers: { Authorization: authHeader },
    });

    if (rateLimitResult.error) {
      console.error('Rate limit invocation failed:', rateLimitResult.error);
      return jsonResponse({ error: 'Rate limit unavailable. Please try again.' }, 503);
    }

    if (rateLimitResult.data?.allowed === false) {
      return jsonResponse({ error: 'Rate limit exceeded. Please try again later.' }, 429);
    }

    // Get Lovable AI API key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return jsonResponse({ error: 'AI service not configured' }, 500);
    }

    // Call Lovable AI for tone analysis using Gemini
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Analyze the emotional tone of the confession. Return ONLY ONE of these emotions: 
calm, anxious, happy, sad, angry, hopeful, grateful, regretful, confused, overwhelmed.
Just the word, nothing else.`
          },
          {
            role: 'user',
            content: content
          }
        ],
        temperature: 0.3,
        max_tokens: 10
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return jsonResponse({ error: 'Failed to analyze tone' }, 500);
    }

    const data = await response.json();
    const tone = data.choices?.[0]?.message?.content?.trim().toLowerCase() || 'confused';

    // Validate tone is one of the allowed values
    const validTones = ['calm', 'anxious', 'happy', 'sad', 'angry', 'hopeful', 'grateful', 'regretful', 'confused', 'overwhelmed'];
    const finalTone = validTones.includes(tone) ? tone : 'confused';

    // Save tone to database if confessionId provided
    if (confessionId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const { data: confessionRow, error: confessionLookupError } = await supabase
        .from('confessions')
        .select('id, user_id')
        .eq('id', confessionId)
        .maybeSingle();

      if (confessionLookupError) {
        console.error('Error loading confession for tone update:', confessionLookupError);
        return jsonResponse({ error: 'Failed to analyze tone' }, 500);
      }
      if (!confessionRow || confessionRow.user_id !== auth.context.userId) {
        return jsonResponse({ error: 'FORBIDDEN_USER_MISMATCH' }, 403);
      }

      const { error: updateError } = await supabase
        .from('confessions')
        .update({ emotional_tone: finalTone })
        .eq('id', confessionId);

      if (updateError) {
        console.error('Error updating confession tone:', updateError);
      }
    }

    return jsonResponse({ tone: finalTone }, 200);
  } catch (error) {
    console.error('Error in analyze-tone function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: errorMessage }, 500);
  }
});
