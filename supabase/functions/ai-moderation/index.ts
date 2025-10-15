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
    const { content, language = 'ro' } = await req.json();
    
    if (!content) {
      throw new Error('Content is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Moderating content in language:', language);

    const languageInstructions: Record<string, string> = {
      en: 'Respond in English',
      es: 'Responde en español',
      de: 'Antworte auf Deutsch',
      ro: 'Răspunde în română'
    };

    const systemPrompt = `You are an AI moderator checking if text contains:
- Violent or threatening content
- Extremely offensive or discriminatory language
- Incitement to self-harm or harm to others
- Spam or aggressive commercial promotion

${languageInstructions[language]}.

Respond ONLY with JSON in this format:
{
  "is_safe": true/false,
  "reason": "brief explanation if unsafe"
}

IMPORTANT: Confessions can contain negative emotions, frustrations or sadness - these are OK and normal. Mark as unsafe ONLY truly dangerous content.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Moderează acest text:\n\n${content}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      // If moderation fails, default to safe (don't block content)
      return new Response(
        JSON.stringify({ is_safe: true, reason: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('Moderation response:', aiResponse);

    // Parse AI response
    let moderationResult;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        moderationResult = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, default to safe
        moderationResult = { is_safe: true, reason: null };
      }
    } catch (parseError) {
      console.error('Error parsing moderation result:', parseError);
      // Default to safe if parsing fails
      moderationResult = { is_safe: true, reason: null };
    }

    console.log('Moderation result:', moderationResult);

    return new Response(
      JSON.stringify(moderationResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-moderation:', error);
    const errorMessage = error instanceof Error ? error.message : 'A apărut o eroare.';
    
    // In case of error, default to safe (don't block content)
    return new Response(
      JSON.stringify({ is_safe: true, reason: null }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
