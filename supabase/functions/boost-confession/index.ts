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

    const { confessionId } = await req.json();

    // Check if user is on trial to determine purchase scope
    const { data: profileCheck } = await supabase
      .from('profiles')
      .select('trial_premium_ends_at')
      .eq('user_id', user.id)
      .single();

    const isOnTrial = profileCheck?.trial_premium_ends_at && 
                      new Date(profileCheck.trial_premium_ends_at) > new Date();
    const purchaseScope = isOnTrial ? 'TRIAL' : 'OWNED';

    if (!confessionId) {
      throw new Error('Confession ID is required');
    }

    // Verify the confession belongs to the user
    const { data: confession, error: confessionError } = await supabase
      .from('confessions')
      .select('id, user_id')
      .eq('id', confessionId)
      .single();

    if (confessionError || !confession) {
      return new Response(
        JSON.stringify({ error: 'Confession not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (confession.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'You can only boost your own confessions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already boosted and active - defensive backend check
    const { data: existingBoost } = await supabase
      .from('confession_boosts')
      .select('id, ends_at, status')
      .eq('confession_id', confessionId)
      .eq('status', 'ACTIVE')
      .gte('ends_at', new Date().toISOString())
      .single();

    if (existingBoost) {
      const secondsRemaining = Math.floor((new Date(existingBoost.ends_at).getTime() - Date.now()) / 1000);
      return new Response(
        JSON.stringify({ 
          error: 'BOOST_ALREADY_ACTIVE',
          message: 'This confession already has an active boost',
          secondsRemaining,
          endsAt: existingBoost.ends_at
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check and deduct coins
    const { data: coinsData, error: coinsError } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (coinsError || !coinsData || coinsData.balance < 15) {
      return new Response(
        JSON.stringify({ error: 'Insufficient coins. You need 15 coins to boost your confession.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct coins
    const { error: deductError } = await supabase.rpc('deduct_coins', {
      _user_id: user.id,
      _amount: 15,
      _type: 'boost_confession',
      _description: 'Boosted confession',
      _reference_id: confessionId
    });

    if (deductError) {
      console.error('Error deducting coins:', deductError);
      throw new Error('Failed to deduct coins');
    }

    // Create boost entry (24 hours boost)
    const boostUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    const { data: boostData, error: boostError } = await supabase
      .from('confession_boosts')
      .insert({
        confession_id: confessionId,
        user_id: user.id,
        coins_spent: 15,
        status: 'ACTIVE',
        boost_until: boostUntil.toISOString(),
        ends_at: boostUntil.toISOString(),
        purchase_scope: purchaseScope,
      })
      .select()
      .single();

    if (boostError) {
      console.error('Error creating boost:', boostError);
      throw new Error('Failed to create boost');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        boost: {
          id: boostData.id,
          endsAt: boostData.ends_at,
          secondsRemaining: 24 * 60 * 60
        },
        coinsDeducted: 15
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in boost-confession:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});