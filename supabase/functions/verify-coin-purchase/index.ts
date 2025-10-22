import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@18.5.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-08-27.basil',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[VERIFY-COIN-PURCHASE] Function started')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      console.error('[VERIFY-COIN-PURCHASE] Auth error:', userError)
      throw new Error('Unauthorized')
    }
    console.log('[VERIFY-COIN-PURCHASE] User authenticated:', user.id)

    const { sessionId } = await req.json()
    if (!sessionId) {
      throw new Error('Missing session_id')
    }
    console.log('[VERIFY-COIN-PURCHASE] Session ID:', sessionId)

    // Create admin client for checking transactions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Duplicate check moved below after retrieving session (uses package_id)

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    console.log('[VERIFY-COIN-PURCHASE] Session retrieved:', session.id, session.payment_status)

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      console.log('[VERIFY-COIN-PURCHASE] Payment not completed yet')
      return new Response(
        JSON.stringify({ success: false, message: 'Payment not completed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Verify user matches
    if (session.metadata?.user_id !== user.id) {
      console.error('[VERIFY-COIN-PURCHASE] User ID mismatch')
      throw new Error('User ID mismatch')
    }

    const coins = parseInt(session.metadata?.coins || '0');

    if (!coins) {
      console.error('[VERIFY-COIN-PURCHASE] Missing coins metadata');
      throw new Error('Missing coins in session metadata');
    }

    // Duplicate check by session_id (unique per transaction)
    const { data: existingTransaction } = await supabaseAdmin
      .from('coin_transactions')
      .select('id')
      .ilike('description', `%${sessionId}%`)
      .maybeSingle();
      
    if (existingTransaction) {
      console.log('[VERIFY-COIN-PURCHASE] Coins already awarded for this session');
      return new Response(
        JSON.stringify({ success: true, already_awarded: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('[VERIFY-COIN-PURCHASE] Awarding', coins, 'coins to user', user.id);

    // Award coins using the database function with session_id as reference
    const { error: awardError } = await supabaseAdmin.rpc('award_coins', {
      p_user_id: user.id,
      p_amount: coins,
      p_session_id: sessionId,
      p_description: `Purchased ${coins} coins via Stripe`
    })

    if (awardError) {
      console.error('[VERIFY-COIN-PURCHASE] Error awarding coins:', awardError)
      throw awardError
    }

    console.log('[VERIFY-COIN-PURCHASE] Successfully awarded', coins, 'coins to user', user.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        coins_awarded: coins,
        already_awarded: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('[VERIFY-COIN-PURCHASE] Error:', errorMessage, error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
