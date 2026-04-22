// Edge Function : stripe-checkout
// Crée une session Stripe Checkout pour upgrades de plan
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Prix Stripe par plan (à renseigner dans le dashboard Stripe)
const STRIPE_PRICE_IDS: Record<string, string> = {
  team:       Deno.env.get('STRIPE_PRICE_TEAM')       ?? '',
  business:   Deno.env.get('STRIPE_PRICE_BUSINESS')   ?? '',
  pro:        Deno.env.get('STRIPE_PRICE_PRO')        ?? '',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const authHeader = req.headers.get('Authorization') ?? ''
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const { organisationId, plan, extraSeats = 0, annual = false } = await req.json()

    const priceId = STRIPE_PRICE_IDS[plan]
    if (!priceId) {
      return new Response(JSON.stringify({ error: `Plan inconnu : ${plan}` }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Récupérer ou créer le customer Stripe
    const { data: org } = await supabaseAdmin
      .from('organisations')
      .select('stripe_customer_id, name, slug')
      .eq('id', organisationId)
      .single()

    const appUrl = Deno.env.get('APP_URL') ?? 'https://app.pilotos.fr'
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''

    const lineItems: unknown[] = [{ price: priceId, quantity: 1 }]

    // Sièges extra
    const extraSeatPriceId = Deno.env.get('STRIPE_PRICE_EXTRA_SEAT')
    if (extraSeats > 0 && extraSeatPriceId) {
      lineItems.push({ price: extraSeatPriceId, quantity: extraSeats })
    }

    const sessionPayload: Record<string, unknown> = {
      mode: 'subscription',
      line_items: lineItems,
      success_url: `${appUrl}/admin/parametres?upgrade=success`,
      cancel_url:  `${appUrl}/admin/parametres?upgrade=cancelled`,
      metadata: { organisation_id: organisationId, plan },
      subscription_data: {
        metadata: { organisation_id: organisationId, plan },
      },
    }

    if (org?.stripe_customer_id) {
      sessionPayload.customer = org.stripe_customer_id
    } else {
      sessionPayload.customer_email = user.email
    }

    if (annual) {
      (sessionPayload.subscription_data as Record<string, unknown>).billing_cycle_anchor_config = { month_day: 1 }
    }

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(flattenStripeParams(sessionPayload)).toString(),
    })

    if (!stripeRes.ok) {
      const err = await stripeRes.text()
      throw new Error(`Stripe error: ${err}`)
    }

    const session = await stripeRes.json()
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[stripe-checkout]', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})

// Aplatit un objet en paramètres Stripe (x-www-form-urlencoded)
function flattenStripeParams(obj: unknown, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}[${k}]` : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flattenStripeParams(v, key))
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === 'object') {
          Object.assign(result, flattenStripeParams(item, `${key}[${i}]`))
        } else {
          result[`${key}[${i}]`] = String(item)
        }
      })
    } else if (v !== undefined && v !== null) {
      result[key] = String(v)
    }
  }
  return result
}
