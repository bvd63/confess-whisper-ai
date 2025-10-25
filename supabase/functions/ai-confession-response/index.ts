import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Payload = {
  userId: string;
  confessionId: string;
  text: string;
  isVip: boolean;
  locale?: 'en' | 'es' | 'de';
};

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
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body = await req.json() as Payload;
    const locale = body.locale ?? 'en';
    const sys = systemPrompts[locale] ?? systemPrompts.en;

    logStep("Request received", { 
      userId: body.userId, 
      confessionId: body.confessionId,
      isVip: body.isVip,
      locale,
      textLength: body.text?.length 
    });

    // VIP priority: use more capable model for VIP users
    const model = body.isVip ? 'google/gemini-2.5-flash' : 'google/gemini-2.5-flash-lite';
    
    logStep("Calling AI", { model, isVip: body.isVip });

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
