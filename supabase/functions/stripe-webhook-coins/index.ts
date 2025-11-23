import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@18.5.0'
import { createFunctionLogger } from '../_shared/logger.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-08-27.basil',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  const requestId = (crypto.randomUUID && crypto.randomUUID()) || Math.random().toString(36).slice(2)
  const logger = createFunctionLogger('stripe-webhook-coins', requestId)

  if (req.method === 'OPTIONS') {
    logger.debug('CORS preflight received')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    logger.info('Webhook received', { path: new URL(req.url).pathname })
    
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      logger.warn('Missing Stripe signature header')
      throw new Error('No signature')
    }

    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!webhookSecret) {
      logger.error('STRIPE_WEBHOOK_SECRET not configured')
      throw new Error('Webhook secret not configured')
    }

    logger.debug('Verifying webhook signature')
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    )

    logger.info('Stripe event received', { eventType: event.type })

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      logger.info('Checkout session completed', { sessionId: session.id, metadata: session.metadata })

      const userId = session.metadata?.user_id
      const packageId = session.metadata?.package_id
      const coins = parseInt(session.metadata?.coins || '0')

      if (!userId || !coins) {
        logger.error('Missing metadata for awarding coins', { userId, coins })
        throw new Error('Missing user_id or coins in metadata')
      }

      logger.info('Awarding coins to user', { userId, coins, packageId })

      // Create admin client (bypasses RLS)
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // Check for duplicate by looking for existing transaction
      const { data: existingTransaction, error: checkError } = await supabaseAdmin
        .from('coin_transactions')
        .select('id, amount')
        .eq('user_id', userId)
        .like('description', `%Session: ${session.id}%`)
        .limit(1)
        .maybeSingle();

      if (checkError) {
        logger.error('Failed to look up existing coin transaction', { error: checkError.message, userId, sessionId: session.id })
        throw checkError
      }

      if (existingTransaction) {
        logger.warn('Coins already awarded for session', { sessionId: session.id, userId })
        return new Response(
          JSON.stringify({ received: true, already_awarded: true }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      // Use the award_coins database function
      const { data: awardResult, error: awardError } = await supabaseAdmin.rpc('award_coins', {
        p_user_id: userId,
        p_amount: coins,
        p_session_id: session.id,
        p_description: `Purchased ${coins} coins`
      });

      if (awardError) {
        logger.error('Error awarding coins', { error: awardError.message, userId, coins, sessionId: session.id })
        throw awardError
      }

      logger.metric('coins_awarded', coins, { userId, sessionId: session.id, packageId })
      logger.info('Successfully awarded coins', { userId, coins, sessionId: session.id, awardResult })
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
    logger.error('stripe-webhook-coins failed', { error: errorMessage })
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
