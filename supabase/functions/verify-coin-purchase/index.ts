import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, getAuthenticatedRequestContext, jsonResponse } from '../_shared/edge-auth.ts';
import {
  awardPurchasedCoins,
  hasExistingCoinAward,
  parseCoinPurchaseFromSession,
} from '../_shared/coin-payments.ts';
import { createStripeClient } from '../_shared/stripe.ts';

const stripe = createStripeClient(Deno.env.get('STRIPE_SECRET_KEY') || '');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const auth = await getAuthenticatedRequestContext(req);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    if (!sessionId) return jsonResponse({ error: "INVALID_REQUEST" }, 400);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const parsed = parseCoinPurchaseFromSession(session, auth.context.userId);
    if (!parsed.ok) {
      if (parsed.error === "FORBIDDEN_USER_MISMATCH") {
        return jsonResponse({ error: parsed.error }, 403);
      }
      if (parsed.error === "PAYMENT_NOT_COMPLETED") {
        return jsonResponse({ success: false, message: "Payment not completed" }, 200);
      }
      return jsonResponse({ error: parsed.error }, 400);
    }

    const duplicate = await hasExistingCoinAward(supabaseAdmin, parsed.data.userId, sessionId);
    if (duplicate.error) {
      return jsonResponse({ error: "DUPLICATE_CHECK_FAILED" }, 500);
    }
    if (duplicate.exists) {
      return jsonResponse({ success: true, already_awarded: true }, 200);
    }

    const { error: awardError } = await awardPurchasedCoins(supabaseAdmin, {
      userId: parsed.data.userId,
      coins: parsed.data.coins,
      sessionId,
      description: `Purchased ${parsed.data.coins} coins via Stripe`,
    });
    if (awardError) return jsonResponse({ error: "AWARD_FAILED" }, 500);

    return jsonResponse({
        success: true, 
        coins_awarded: parsed.data.coins,
        already_awarded: false 
      }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VERIFY-COIN-PURCHASE] Error:', errorMessage, error);
    return jsonResponse({ error: errorMessage }, 400);
  }
})
