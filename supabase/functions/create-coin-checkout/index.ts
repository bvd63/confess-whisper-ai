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
    console.log('[COIN-CHECKOUT] Function started')
    
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
      console.error('[COIN-CHECKOUT] Auth error:', userError)
      throw new Error('Unauthorized')
    }
    console.log('[COIN-CHECKOUT] User authenticated:', user.id)

    const { packageId } = await req.json()
    console.log('[COIN-CHECKOUT] Package ID:', packageId)

    // Get package details from database
    const { data: pkg, error: pkgError } = await supabaseClient
      .from('coin_packages')
      .select('*')
      .eq('id', packageId)
      .single()

    if (pkgError || !pkg) {
      console.error('[COIN-CHECKOUT] Package error:', pkgError)
      throw new Error('Package not found')
    }
    console.log('[COIN-CHECKOUT] Package found:', pkg.name, pkg.price_usd)

    // Check if we have a stripe_price_id, if not create it
    let priceId = pkg.stripe_price_id

    if (!priceId) {
      console.log('[COIN-CHECKOUT] Creating Stripe product for package:', pkg.name)
      
      // Create product in Stripe
      const product = await stripe.products.create({
        name: `${pkg.coins} Coins - ${pkg.name} Pack`,
        description: `Get ${pkg.coins} coins${pkg.discount_percentage > 0 ? ` with ${pkg.discount_percentage}% discount` : ''}`,
        metadata: {
          package_id: packageId,
          coins: pkg.coins.toString(),
        },
      })
      console.log('[COIN-CHECKOUT] Product created:', product.id)

      // Create price in Stripe
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(pkg.price_usd * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          package_id: packageId,
          coins: pkg.coins.toString(),
        },
      })
      console.log('[COIN-CHECKOUT] Price created:', price.id)

      priceId = price.id

      // Save Stripe Price ID to database for future use
      await supabaseClient
        .from('coin_packages')
        .update({ stripe_price_id: priceId })
        .eq('id', packageId)
      
      console.log('[COIN-CHECKOUT] Price ID saved to database')
    }

    console.log('[COIN-CHECKOUT] Creating checkout session with price:', priceId)

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/coins/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/coins/cancel`,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        package_id: packageId,
        coins: pkg.coins.toString(),
      },
    })

    console.log('[COIN-CHECKOUT] Session created:', session.id)

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('[COIN-CHECKOUT] Error:', errorMessage, error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
