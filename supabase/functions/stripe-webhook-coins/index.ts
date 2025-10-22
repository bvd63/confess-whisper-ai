import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@18.5.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-08-27.basil',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[STRIPE-WEBHOOK-COINS] Webhook received')
    
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      console.error('[STRIPE-WEBHOOK-COINS] Missing signature')
      throw new Error('No signature')
    }

    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!webhookSecret) {
      console.error('[STRIPE-WEBHOOK-COINS] STRIPE_WEBHOOK_SECRET not configured')
      throw new Error('Webhook secret not configured')
    }

    console.log('[STRIPE-WEBHOOK-COINS] Verifying webhook signature...')
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    )

    console.log('[STRIPE-WEBHOOK-COINS] Event type:', event.type)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      console.log('[STRIPE-WEBHOOK-COINS] Session completed:', session.id)
      console.log('[STRIPE-WEBHOOK-COINS] Metadata:', session.metadata)

      const userId = session.metadata?.user_id
      const packageId = session.metadata?.package_id
      const coins = parseInt(session.metadata?.coins || '0')

      if (!userId || !coins) {
        console.error('[STRIPE-WEBHOOK-COINS] Missing metadata - userId:', userId, 'coins:', coins)
        throw new Error('Missing user_id or coins in metadata')
      }

      console.log('[STRIPE-WEBHOOK-COINS] Awarding', coins, 'coins to user', userId)

      // Create admin client (bypasses RLS)
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // Check for duplicate by session_id (unique per transaction)
      const { data: existingTransaction } = await supabaseAdmin
        .from('coin_transactions')
        .select('id')
        .eq('reference_id', session.id)
        .maybeSingle()

      if (existingTransaction) {
        console.log('[STRIPE-WEBHOOK-COINS] Coins already awarded for session:', session.id)
        return new Response(
          JSON.stringify({ received: true, already_awarded: true }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      // Use the award_coins database function with session_id as reference
      const { error: awardError } = await supabaseAdmin.rpc('award_coins', {
        _user_id: userId,
        _amount: coins,
        _type: 'coin_purchase',
        _description: `Purchased ${coins} coins via Stripe`,
        _reference_id: session.id
      })

      if (awardError) {
        console.error('[STRIPE-WEBHOOK-COINS] Error awarding coins:', awardError)
        throw awardError
      }

      console.log('[STRIPE-WEBHOOK-COINS] Successfully awarded', coins, 'coins to user', userId)
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[STRIPE-WEBHOOK-COINS] Error:', errorMessage, error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
