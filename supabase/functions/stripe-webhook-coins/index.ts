import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  awardPurchasedCoins,
  hasExistingCoinAward,
  parseCoinPurchaseFromSession,
} from '../_shared/coin-payments.ts';
import { corsHeaders, jsonResponse } from '../_shared/edge-auth.ts';
import { createStripeClient } from '../_shared/stripe.ts';
import { validateStripeWebhookEvent } from '../_shared/webhook-security.ts';

const stripe = createStripeClient(Deno.env.get('STRIPE_SECRET_KEY') || '');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    console.log('[STRIPE-WEBHOOK-COINS] Webhook received')
    
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const validation = await validateStripeWebhookEvent({
      signature,
      webhookSecret,
      rawBody: body,
      constructEvent: (raw, sig, secret) => stripe.webhooks.constructEventAsync(raw, sig, secret),
    });
    if (!validation.ok) {
      console.error('[STRIPE-WEBHOOK-COINS] Webhook validation failed', validation.error);
      return jsonResponse({ error: validation.error }, validation.status);
    }
    const event = validation.event;

    console.log('[STRIPE-WEBHOOK-COINS] Event type:', event.type)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any

      const parsed = parseCoinPurchaseFromSession(session);
      if (!parsed.ok) {
        console.error('[STRIPE-WEBHOOK-COINS] Invalid purchase metadata', parsed.error);
        throw new Error(parsed.error);
      }

      // Create admin client (bypasses RLS)
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const duplicate = await hasExistingCoinAward(supabaseAdmin, parsed.data.userId, session.id);
      if (duplicate.error) {
        throw new Error(`DUPLICATE_CHECK_FAILED:${duplicate.error}`);
      }

      if (duplicate.exists) {
        console.log('[STRIPE-WEBHOOK-COINS] Coins already awarded for session:', session.id)
        return jsonResponse({ received: true, already_awarded: true }, 200);
      }

      const { error: awardError } = await awardPurchasedCoins(supabaseAdmin, {
        userId: parsed.data.userId,
        coins: parsed.data.coins,
        sessionId: session.id,
        description: `Purchased ${parsed.data.coins} coins`,
      });
      if (awardError) {
        console.error('[STRIPE-WEBHOOK-COINS] Error awarding coins:', awardError)
        throw awardError
      }

      console.log('[STRIPE-WEBHOOK-COINS] Successfully awarded', parsed.data.coins, 'coins to user', parsed.data.userId)
    }

    return jsonResponse({ received: true }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[STRIPE-WEBHOOK-COINS] Error:', errorMessage, error)
    return jsonResponse({ error: errorMessage }, 400);
  }
})
