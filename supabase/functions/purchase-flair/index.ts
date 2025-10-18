import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { flairId, equip = true } = await req.json();

    if (!flairId) {
      throw new Error('Flair ID is required');
    }

    // Get flair details
    const { data: flair, error: flairError } = await supabase
      .from('profile_flairs')
      .select('*')
      .eq('id', flairId)
      .eq('is_active', true)
      .single();

    if (flairError || !flair) {
      return new Response(
        JSON.stringify({ error: 'Flair not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already owns this flair
    const { data: existingFlair } = await supabase
      .from('user_flairs')
      .select('id')
      .eq('user_id', user.id)
      .eq('flair_id', flairId)
      .single();

    if (existingFlair) {
      return new Response(
        JSON.stringify({ error: 'You already own this flair' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check and deduct coins
    const { data: coinsData, error: coinsError } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (coinsError || !coinsData || coinsData.balance < flair.cost) {
      return new Response(
        JSON.stringify({ error: `Insufficient coins. You need ${flair.cost} coins to purchase this flair.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct coins
    const { error: deductError } = await supabase.rpc('deduct_coins', {
      _user_id: user.id,
      _amount: flair.cost,
      _type: 'flair_purchase',
      _description: `Purchased ${flair.name_key} flair`,
      _reference_id: flairId
    });

    if (deductError) {
      console.error('Error deducting coins:', deductError);
      throw new Error('Failed to deduct coins');
    }

    // If equipping, unequip any currently equipped flair
    if (equip) {
      await supabase
        .from('user_flairs')
        .update({ is_equipped: false })
        .eq('user_id', user.id)
        .eq('is_equipped', true);
    }

    // Purchase flair
    const { data: purchasedFlair, error: purchaseError } = await supabase
      .from('user_flairs')
      .insert({
        user_id: user.id,
        flair_id: flairId,
        is_equipped: equip
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Error purchasing flair:', purchaseError);
      throw new Error('Failed to purchase flair');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        flair: { ...purchasedFlair, details: flair },
        coinsDeducted: flair.cost
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in purchase-flair:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});