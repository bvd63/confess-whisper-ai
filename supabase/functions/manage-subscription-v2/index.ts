import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getServerEnv } from "../_shared/env.ts";
import { createServiceClient, requireAuth } from "../_shared/supabase.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { logError, logInfo } from "../_shared/logger.ts";

const PayloadSchema = z.object({
  action: z.enum(['upgrade', 'downgrade', 'cancel', 'reactivate', 'cancel_now']),
  targetTier: z.literal('vip').optional(),
  when: z.enum(['now', 'period_end']).optional(),
});

serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return handleOptions(origin);
  }

  try {
    const env = getServerEnv();
    const authHeader = req.headers.get("Authorization");
    const authResult = await requireAuth(authHeader);
    if (!authResult.user || !authResult.user.email) {
      return jsonResponse({ error: "UNAUTHORIZED" }, 401, origin);
    }

    const body = await req.json();
    const parsed = PayloadSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: "INVALID_PAYLOAD" }, 400, origin);
    }

    const { action, targetTier, when } = parsed.data;

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
    const supabaseClient = createServiceClient();

    if (action === 'cancel_now') {
      logInfo('manage-subscription-v2 cancel trial', { userId: authResult.user.id });

      await supabaseClient
        .from('profiles')
        .update({
          trial_active: false,
          subscription_tier: 'free',
        })
        .eq('user_id', authResult.user.id);

      return jsonResponse({ message: "Trial canceled successfully" }, 200, origin);
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('trial_active, trial_premium_ends_at')
      .eq('user_id', authResult.user.id)
      .single();

    // Check if on active trial
    if (profile?.trial_active && profile?.trial_premium_ends_at) {
      const trialEndsAt = new Date(profile.trial_premium_ends_at);
      if (trialEndsAt > new Date()) {
        return jsonResponse({
          error: "Cannot modify trial subscription. Please wait until trial ends or cancel it first.",
        }, 400, origin);
      }
    }

    const customers = await stripe.customers.list({ email: authResult.user.email, limit: 1 });
    if (customers.data.length === 0) {
      return jsonResponse({ error: "No Stripe customer found. Please subscribe first." }, 400, origin);
    }

    const customerId = customers.data[0].id;
    logInfo('manage-subscription-v2 customer located', { userId: authResult.user.id });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return jsonResponse({ error: "No active subscription found. Please subscribe first." }, 400, origin);
    }

    const subscription = subscriptions.data[0];
    const currentItem = subscription.items.data[0];
    
    logInfo('manage-subscription-v2 subscription loaded', { subscriptionId: subscription.id });

    // Handle actions
    if (action === 'upgrade' || action === 'downgrade') {
      if (targetTier !== 'vip') {
        return jsonResponse({ error: "Unsupported tier" }, 400, origin);
      }
      const currentInterval = currentItem.price.recurring?.interval || 'month';
      const targetPrice = currentInterval === 'year'
        ? env.STRIPE_PRICE_VIP_YEARLY
        : env.STRIPE_PRICE_VIP_MONTHLY;

      if (!targetPrice) {
        return jsonResponse({ error: "PRICE_NOT_CONFIGURED" }, 500, origin);
      }

      await stripe.subscriptions.update(subscription.id, {
        items: [
          {
            id: currentItem.id,
            price: targetPrice,
          },
        ],
        proration_behavior: 'create_prorations',
      });

      await supabaseClient
        .from('profiles')
        .update({
          subscription_tier: targetTier ?? 'vip',
        })
        .eq('user_id', authResult.user.id);

      return jsonResponse({
        message: action === 'upgrade' ? "Upgraded successfully" : "Downgraded successfully",
      }, 200, origin);
    }

    if (action === 'cancel') {
      await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      });

      await supabaseClient
        .from('profiles')
        .update({
          subscription_cancel_at_period_end: true,
        })
        .eq('user_id', authResult.user.id);

      return jsonResponse({ message: "Subscription will cancel at period end" }, 200, origin);
    }

    if (action === 'reactivate') {
      await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: false,
      });

      await supabaseClient
        .from('profiles')
        .update({
          subscription_cancel_at_period_end: false,
        })
        .eq('user_id', authResult.user.id);

      return jsonResponse({ message: "Subscription reactivated successfully" }, 200, origin);
    }

    return jsonResponse({ error: "Invalid action" }, 400, origin);
  } catch (error) {
    logError('manage-subscription-v2 failed', { error: error instanceof Error ? error.message : String(error) });
    return jsonResponse({ error: "INTERNAL_ERROR" }, 500, origin);
  }
});
