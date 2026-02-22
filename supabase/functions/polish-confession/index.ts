import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { fetchWithTimeout } from "../_shared/fetch-with-timeout.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const startTime = performance.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { confessionText, language = 'en' } = await req.json();

    if (!confessionText || confessionText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Confession text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check and deduct coins
    const { data: coinsData, error: coinsError } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();

    if (coinsError || !coinsData || coinsData.balance < 10) {
      return new Response(
        JSON.stringify({ error: 'Insufficient coins. You need 10 coins to polish your confession.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Lovable AI to polish the confession
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = language === 'es' 
      ? 'Eres un experto en mejorar textos. Mejora la siguiente confesión haciéndola más clara, emotiva y bien redactada. Mantén el tono personal y sincero. NO agregues comentarios adicionales, solo devuelve el texto mejorado.'
      : language === 'de'
      ? 'Du bist ein Experte darin, Texte zu verbessern. Verbessere das folgende Geständnis, indem du es klarer, emotionaler und besser formuliert machst. Behalte den persönlichen und aufrichtigen Ton bei. Füge KEINE zusätzlichen Kommentare hinzu, sondern gib nur den verbesserten Text zurück.'
      : 'You are an expert at improving text. Enhance the following confession by making it clearer, more emotive, and better written. Maintain the personal and sincere tone. Do NOT add additional comments, just return the improved text.';

    const aiResponse = await fetchWithTimeout('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: confessionText }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    }, 20_000);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error('Failed to polish confession');
    }

    const aiData = await aiResponse.json();
    const polishedText = aiData.choices?.[0]?.message?.content?.trim();

    if (!polishedText) {
      throw new Error('No polished text received from AI');
    }

    // Deduct coins using the deduct_coins function
    const { error: deductError } = await supabase.rpc('deduct_coins', {
      _user_id: user.id,
      _amount: 10,
      _type: 'polish_confession',
      _description: 'AI confession polish'
    });

    if (deductError) {
      console.error('Error deducting coins:', deductError);
      throw new Error('Failed to deduct coins');
    }

    const duration = performance.now() - startTime;
    console.log(`Polish confession completed in ${duration.toFixed(2)}ms`);

    return new Response(
      JSON.stringify({ 
        success: true,
        polishedText,
        coinsDeducted: 10
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in polish-confession:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});