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
    const { confession, type = 'basic' } = await req.json();
    
    if (!confession) {
      throw new Error('Confession text is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Processing confession with type:', type);

    let systemPrompt = '';
    
    if (type === 'deep') {
      systemPrompt = `Ești un consilier virtual profund empatic și înțelegător. Utilizatorul ți-a împărtășit o confesiune personală și tu trebuie să oferi o analiză profundă, plină de empatie și perspectivă.

Răspunde în limba română, cu:
- Validare profundă a emoțiilor lor
- Perspective psihologice blânde și accesibile
- Sugestii practice și reconfortante
- Un ton cald, neînvățat și plin de înțelegere
- Lungime: 150-200 cuvinte

Nu judeca niciodată. Fii ca un prieten înțelegător care ascultă și oferă sprijin real.`;
    } else {
      systemPrompt = `Ești un consilier virtual empatic și blând. Utilizatorul ți-a împărtășit o confesiune anonimă și tu trebuie să răspunzi cu căldură și înțelegere.

Răspunde în limba română, cu:
- Validare emoțională ("Înțeleg ce simți...", "E perfect normal să...")
- Empatie autentică
- Încurajare blândă
- Fără judecată sau critică
- Lungime: 60-80 cuvinte

Fii ca un prieten de încredere care ascultă fără să judece.`;
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
          error: 'Prea multe cereri. Te rugăm să încerci din nou mai târziu.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Serviciul AI este temporar indisponibil.' 
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
    const errorMessage = error instanceof Error ? error.message : 'A apărut o eroare.';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
