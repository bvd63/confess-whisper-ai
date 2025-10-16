import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { confession, type = 'basic', language = 'ro' } = await req.json();
    
    if (!confession) {
      throw new Error('Confession text is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Processing confession with type:', type, 'language:', language);

    const languageInstructions: Record<string, string> = {
      en: 'Respond in English',
      es: 'Responde en español',
      de: 'Antworte auf Deutsch',
      ro: 'Răspunde în română'
    };

    let systemPrompt = '';
    
    if (type === 'deep') {
      systemPrompt = `You are a deeply empathetic and understanding virtual counselor. The user has shared a personal confession with you and you need to provide a deep, empathetic and insightful analysis.

${languageInstructions[language]} with:
- Deep validation of their emotions
- Gentle and accessible psychological perspectives
- Practical and comforting suggestions
- A warm, non-judgmental and understanding tone
- Length: 150-200 words

Never judge. Be like an understanding friend who listens and offers real support.`;
    } else {
      systemPrompt = `You are an empathetic and gentle virtual counselor. The user has shared an anonymous confession with you and you need to respond with warmth and understanding.

${languageInstructions[language]} with:
- Emotional validation ("I understand what you're feeling...", "It's perfectly normal to...")
- Authentic empathy
- Gentle encouragement
- No judgment or criticism
- Length: 60-80 words

Be like a trusted friend who listens without judging.`;
    }

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
          { role: 'user', content: confession }
        ],
      }),
    });

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
