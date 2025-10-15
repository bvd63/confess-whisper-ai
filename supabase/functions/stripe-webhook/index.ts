import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);

    console.log('Webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id || session.client_reference_id;
        
        if (!userId) {
          console.error('No user_id found in session');
          break;
        }

        await supabase
          .from('profiles')
          .update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            subscription_status: 'active',
            is_premium: true,
          })
          .eq('user_id', userId);

        console.log(`Updated user ${userId} to premium`);
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (profile) {
          const isPremium = subscription.status === 'active';
          
          await supabase
            .from('profiles')
            .update({
              subscription_status: subscription.status,
              is_premium: isPremium,
            })
            .eq('user_id', profile.user_id);

          console.log(`Updated subscription status for user ${profile.user_id}: ${subscription.status}`);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        if (paymentIntent.customer) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('stripe_customer_id', paymentIntent.customer as string)
            .single();

          if (profile) {
            await supabase
              .from('payment_history')
              .insert({
                user_id: profile.user_id,
                stripe_payment_id: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                status: paymentIntent.status,
              });

            console.log(`Recorded payment for user ${profile.user_id}`);
          }
        }
        break;
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});