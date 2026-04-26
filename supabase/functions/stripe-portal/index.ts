// Edge Function : stripe-portal
// Crée une session portail client Stripe (gestion abonnement, factures, CB)
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { organisation_id } = await req.json()

    const { data: org } = await supabaseAdmin
      .from('organisations')
      .select('stripe_customer_id')
      .eq('id', organisation_id)
      .single()

    if (!org?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'Aucun abonnement Stripe actif' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const appUrl = Deno.env.get('APP_URL') ?? 'https://app.pilotos.fr'
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''

    const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer:    org.stripe_customer_id,
        return_url:  `${appUrl}/admin/parametres`,
      }).toString(),
    })

    if (!portalRes.ok) {
      const err = await portalRes.text()
      throw new Error(`Stripe portal error: ${err}`)
    }

    const session = await portalRes.json()
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[stripe-portal]', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
