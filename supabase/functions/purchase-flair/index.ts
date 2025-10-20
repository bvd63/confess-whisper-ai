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

    // Check if user is on trial to determine purchase scope
    const { data: profileCheck } = await supabase
      .from('profiles')
      .select('trial_premium_ends_at')
      .eq('user_id', user.id)
      .single();

    const isOnTrial = profileCheck?.trial_premium_ends_at && 
                      new Date(profileCheck.trial_premium_ends_at) > new Date();
    const purchaseScope = isOnTrial ? 'TRIAL' : 'OWNED';

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

    // Check user's subscription tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('user_id', user.id)
      .single();

    const userTier = (profile?.subscription_tier || 'free') as 'free' | 'premium' | 'vip';
    const requiredTier = (flair.required_plan || 'free') as 'free' | 'premium' | 'vip';

    // Tier hierarchy: free < premium < vip
    const tierLevel: Record<'free' | 'premium' | 'vip', number> = { free: 0, premium: 1, vip: 2 };
    if (tierLevel[userTier] < tierLevel[requiredTier]) {
      return new Response(
        JSON.stringify({ 
          error: `This flair requires ${requiredTier} subscription`,
          requiredPlan: requiredTier 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate coin cost based on user tier
    const tierPricing: Record<'free' | 'premium' | 'vip', number> = {
      free: 25,
      premium: 50,
      vip: 100
    };
    const flairCost = tierPricing[userTier];

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

    if (coinsError || !coinsData || coinsData.balance < flairCost) {
      return new Response(
        JSON.stringify({ error: `Insufficient coins. You need ${flairCost} coins to purchase this flair.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct coins
    const { error: deductError } = await supabase.rpc('deduct_coins', {
      _user_id: user.id,
      _amount: flairCost,
      _type: 'flair_purchase',
      _description: `Purchased ${flair.name_key} flair`,
      _reference_id: flairId
    });

    if (deductError) {
      console.error('Error deducting coins:', deductError);
      throw new Error('Failed to deduct coins');
    }

    // If equipping, unequip any currently equipped flair and unfeatured them
    if (equip) {
      await supabase
        .from('user_flairs')
        .update({ is_equipped: false, is_featured: false })
        .eq('user_id', user.id)
        .eq('is_equipped', true);
    }

    // Calculate expiry date (5 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 5);

    // Purchase flair - if equipping, make it featured and public so it shows everywhere
    const { data: purchasedFlair, error: purchaseError } = await supabase
      .from('user_flairs')
      .insert({
        user_id: user.id,
        flair_id: flairId,
        is_equipped: equip,
        is_featured: equip, // Featured if equipped
        is_public: equip,    // Public if equipped
        acquired_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        purchase_scope: purchaseScope,
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
        coinsDeducted: flairCost
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