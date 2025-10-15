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
    const { referralCode } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) throw new Error('User not authenticated');

    console.log('Processing referral for user:', user.id, 'with code:', referralCode);

    // Find the referrer by referral code
    const { data: referrerProfile, error: referrerError } = await supabaseClient
      .from('profiles')
      .select('user_id, total_referrals')
      .eq('referral_code', referralCode)
      .single();

    if (referrerError || !referrerProfile) {
      console.log('Referral code not found:', referralCode);
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid referral code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Don't allow self-referral
    if (referrerProfile.user_id === user.id) {
      console.log('Self-referral attempt blocked');
      return new Response(
        JSON.stringify({ success: false, message: 'Cannot use your own referral code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Update the new user's profile with referrer
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ referred_by: referrerProfile.user_id })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating referred user:', updateError);
      throw updateError;
    }

    // Create referral record
    const { error: referralError } = await supabaseClient
      .from('referrals')
      .insert({
        referrer_user_id: referrerProfile.user_id,
        referred_user_id: user.id,
        referral_code: referralCode,
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

    if (referralError) {
      console.error('Error creating referral:', referralError);
      throw referralError;
    }

    // Update referrer's total referrals count
    const { error: countError } = await supabaseClient
      .from('profiles')
      .update({ 
        total_referrals: (referrerProfile.total_referrals || 0) + 1 
      })
      .eq('user_id', referrerProfile.user_id);

    if (countError) {
      console.error('Error updating referral count:', countError);
    }

    // TODO: Award 1 day premium to referrer
    // This would integrate with your Stripe subscription system
    // For now, we just track the referrals

    console.log('Referral processed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Referral processed successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in process-referral:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});