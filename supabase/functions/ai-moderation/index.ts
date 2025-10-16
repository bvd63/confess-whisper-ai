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
    const { content, language = 'en' } = await req.json();
    
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
      de: 'Antworte auf Deutsch'
    };
    
    const selectedLanguage = languageInstructions[language] || languageInstructions.en;

    const systemPrompt = `You are an AI moderator checking if text contains:
- Violent or threatening content
- Extremely offensive or discriminatory language
- Incitement to self-harm or harm to others
- Spam or aggressive commercial promotion

${selectedLanguage}.

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
          { role: 'user', content: `Moderate this text:\n\n${content}` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'moderate_content',
              description: 'Moderate content and return safety assessment',
              parameters: {
                type: 'object',
                properties: {
                  is_safe: {
                    type: 'boolean',
                    description: 'Whether the content is safe'
                  },
                  reason: {
                    type: 'string',
                    description: 'Brief explanation if content is unsafe, null otherwise'
                  }
                },
                required: ['is_safe'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'moderate_content' } }
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
    
    console.log('Moderation raw response:', JSON.stringify(data));

    // Extract structured output from tool call
    let moderationResult;
    try {
      const toolCall = data.choices[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        moderationResult = JSON.parse(toolCall.function.arguments);
      } else {
        // Fallback to safe if no tool call
        moderationResult = { is_safe: true, reason: null };
      }
    } catch (parseError) {
      console.error('Error parsing moderation result:', parseError);
      moderationResult = { is_safe: true, reason: null };
    }

    console.log('Moderation result:', moderationResult);

    return new Response(
      JSON.stringify(moderationResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-moderation:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred.';
    
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
