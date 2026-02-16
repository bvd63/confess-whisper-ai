import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonResponse, requireInternalSecret } from "../_shared/edge-auth.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  const internal = requireInternalSecret(req);
  if (!internal.ok) return internal.response;

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get current QOTD state
    const { data: currentState } = await supabaseAdmin
      .from('app_state')
      .select('value')
      .eq('key', 'quote_of_the_day')
      .single();

    const lastRotated = currentState?.value?.rotated_at;
    const now = new Date();
    
    // Check if we need to rotate (24 hours since last rotation)
    if (lastRotated) {
      const lastRotatedDate = new Date(lastRotated);
      const hoursSince = (now.getTime() - lastRotatedDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSince < 24) {
        return jsonResponse({ message: 'Quote already rotated today', rotated: false }, 200);
      }
    }

    // Get all quotes ordered by usage count (least used first) and random
    const { data: quotes, error: quotesError } = await supabaseAdmin
      .from('quotes')
      .select('*')
      .order('used_count', { ascending: true })
      .limit(10);

    if (quotesError || !quotes || quotes.length === 0) {
      throw new Error('No quotes available');
    }

    // Pick a random quote from the least used ones
    const selectedQuote = quotes[Math.floor(Math.random() * quotes.length)];

    // Update quote usage count
    await supabaseAdmin
      .from('quotes')
      .update({ used_count: selectedQuote.used_count + 1 })
      .eq('id', selectedQuote.id);

    // Update QOTD state
    await supabaseAdmin
      .from('app_state')
      .update({
        value: {
          quote_id: selectedQuote.id,
          text_en: selectedQuote.text_en,
          text_es: selectedQuote.text_es,
          text_de: selectedQuote.text_de,
          author: selectedQuote.author,
          category: selectedQuote.category,
          rotated_at: now.toISOString()
        },
        updated_at: now.toISOString()
      })
      .eq('key', 'quote_of_the_day');

    console.log('QOTD rotated successfully:', selectedQuote.id);

    return jsonResponse({
      message: 'Quote rotated successfully',
      rotated: true,
      quote: selectedQuote,
    }, 200);

  } catch (error) {
    console.error('Error rotating QOTD:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: errorMessage }, 500);
  }
});