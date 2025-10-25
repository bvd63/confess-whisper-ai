import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting in-memory store
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const AI_RATE_LIMIT = { maxAttempts: 5, windowMs: 60000 }; // 5 per minute

function log(level: 'info' | 'warn' | 'error', message: string, metadata?: any) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    function: 'ai-confession-response',
    metadata,
  }));
}

function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const key = `ai_request:${userId}`;
  const now = Date.now();
  const rateLimitData = rateLimits.get(key);

  if (!rateLimitData || now > rateLimitData.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + AI_RATE_LIMIT.windowMs });
    return { allowed: true };
  }

  if (rateLimitData.count >= AI_RATE_LIMIT.maxAttempts) {
    const retryAfter = Math.ceil((rateLimitData.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  rateLimitData.count++;
  rateLimits.set(key, rateLimitData);
  return { allowed: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  log('info', 'AI confession request started', { requestId });

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      log('warn', 'Unauthorized request', { requestId });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      log('warn', 'Invalid token', { requestId, error: authError?.message });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting
    const rateCheck = checkRateLimit(user.id);
    if (!rateCheck.allowed) {
      log('warn', 'Rate limit exceeded', { requestId, userId: user.id, retryAfter: rateCheck.retryAfter });
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: rateCheck.retryAfter 
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': rateCheck.retryAfter!.toString(),
        },
      });
    }

    const { confession, category, imageUrl, type = 'basic', language = 'en' } = await req.json();
    log('info', 'Processing request', { requestId, userId: user.id, type, language, hasImage: !!imageUrl, category });
    
    if (!confession) {
      throw new Error('Confession text is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Whitelist: only EN/ES/DE supported, coerce to EN if invalid
    const SUPPORTED_LANGUAGES = ['en', 'es', 'de'];
    const validLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';

    console.log('Processing confession with type:', type, 'language:', validLanguage);

    const languageInstructions: Record<string, string> = {
      en: 'Respond in English',
      es: 'Responde en español',
      de: 'Antworte auf Deutsch'
    };
    
    const selectedLanguage = languageInstructions[validLanguage];

    // Build context about the confession
    let contextNote = category && category !== 'other' 
      ? `This confession is about ${category}. ` 
      : '';
    
    if (imageUrl) {
      contextNote += 'The user has attached an image. Analyze it and incorporate your observations into your response. ';
    }

    let systemPrompt = '';
    
    if (type === 'deep') {
      systemPrompt = `You are a deeply empathetic and understanding virtual counselor. The user has shared a personal confession with you and you need to provide a deep, empathetic and insightful analysis.

${contextNote}IMPORTANT: Stay on topic. Analyze the confession content (and image if provided) regardless of the category. Never ask for more information or images - work with what you're given.

${selectedLanguage} with:
- Deep validation of their emotions
- Gentle and accessible psychological perspectives
- Practical and comforting suggestions
- A warm, non-judgmental and understanding tone
- Length: 150-200 words
- If an image is present, describe what you observe and how it relates to their confession

Never judge. Be like an understanding friend who listens and offers real support.`;
    } else {
      systemPrompt = `You are an empathetic and gentle virtual counselor. The user has shared an anonymous confession with you and you need to respond with warmth and understanding.

${contextNote}IMPORTANT: Stay on topic. Analyze the confession content (and image if provided) regardless of the category. Never ask for more information or images - work with what you're given.

${selectedLanguage} with:
- Emotional validation ("I understand what you're feeling...", "It's perfectly normal to...")
- Authentic empathy
- Gentle encouragement
- No judgment or criticism
- Length: 60-80 words
- If an image is present, briefly acknowledge what you see and how it relates to their feelings

Be like a trusted friend who listens without judging.`;
    }

    // Build user message with image if available
    const userMessage: any = {
      role: 'user',
      content: imageUrl 
        ? [
            { type: 'text', text: confession },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        : confession
    };

    // Add timeout to AI request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const startTime = Date.now();
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          userMessage
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    log('info', 'AI request completed', { requestId, userId: user.id, duration });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Too many requests. Please try again later.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'AI service is temporarily unavailable.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error('Failed to get AI response');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI response generated successfully');

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-confession-response:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred.';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
