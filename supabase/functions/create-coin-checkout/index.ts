import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
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
      throw new Error('Unauthorized')
    }

    const { packageId } = await req.json()

    // Get package details from database
    const { data: pkg, error: pkgError } = await supabaseClient
      .from('coin_packages')
      .select('*')
      .eq('id', packageId)
      .single()

    if (pkgError || !pkg) {
      throw new Error('Package not found')
    }

    // Create or get Stripe product & price dynamically
    let priceId = pkg.stripe_price_id

    if (!priceId) {
      console.log(`Creating Stripe product for package: ${pkg.name}`)
      
      // Create product in Stripe
      const product = await stripe.products.create({
        name: `${pkg.coins} Coins - ${pkg.name} Pack`,
        description: `Get ${pkg.coins} coins${pkg.discount_percentage > 0 ? ` with ${pkg.discount_percentage}% discount` : ''}`,
        metadata: {
          package_id: packageId,
          coins: pkg.coins.toString(),
        },
      })

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

      priceId = price.id

      // Save Stripe Price ID to database for future use
      await supabaseClient
        .from('coin_packages')
        .update({ stripe_price_id: priceId })
        .eq('id', packageId)
      
      console.log(`Created Stripe price: ${priceId} for package: ${pkg.name}`)
    }

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

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
