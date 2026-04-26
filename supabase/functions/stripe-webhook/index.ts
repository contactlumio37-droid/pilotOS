// Edge Function : stripe-webhook
// Traite les événements Stripe : upgrade plan, annulation, paiement échoué
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const PLAN_BY_PRICE: Record<string, string> = {
  [Deno.env.get('STRIPE_PRICE_TEAM')     ?? '__team__']:     'team',
  [Deno.env.get('STRIPE_PRICE_BUSINESS') ?? '__business__']: 'business',
  [Deno.env.get('STRIPE_PRICE_PRO')      ?? '__pro__']:      'pro',
}

serve(async (req) => {
  const webhookSecret   = Deno.env.get('STRIPE_WEBHOOK_SECRET')    ?? ''

  const body      = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  // Vérification de signature Stripe (HMAC SHA-256)
  const valid = await verifyStripeSignature(body, signature, webhookSecret)
  if (!valid) {
    return new Response('Invalid signature', { status: 400 })
  }

  const event = JSON.parse(body)
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const orgId   = session.metadata?.organisation_id
        const plan    = session.metadata?.plan
        if (!orgId || !plan) break

        await supabaseAdmin
          .from('organisations')
          .update({
            plan,
            stripe_customer_id:      session.customer,
            stripe_subscription_id:  session.subscription,
            is_active:               true,
            updated_at:              new Date().toISOString(),
          })
          .eq('id', orgId)

        await supabaseAdmin.from('admin_audit_log').insert({
          action: 'stripe_checkout_completed',
          target_type: 'organisation',
          target_id: orgId,
          after_state: { plan, stripe_customer_id: session.customer },
        })
        break
      }

      case 'customer.subscription.updated': {
        const sub     = event.data.object
        const orgId   = sub.metadata?.organisation_id
        if (!orgId) break

        const priceId = sub.items?.data?.[0]?.price?.id
        const plan    = PLAN_BY_PRICE[priceId] ?? 'free'
        const status  = sub.status // active, past_due, cancelled...

        await supabaseAdmin
          .from('organisations')
          .update({
            plan,
            is_active:  status === 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orgId)
        break
      }

      case 'customer.subscription.deleted': {
        const sub   = event.data.object
        const orgId = sub.metadata?.organisation_id
        if (!orgId) break

        await supabaseAdmin
          .from('organisations')
          .update({ plan: 'free', is_active: true, updated_at: new Date().toISOString() })
          .eq('id', orgId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const { data: org } = await supabaseAdmin
          .from('organisations')
          .select('id')
          .eq('stripe_customer_id', invoice.customer)
          .single()
        if (org) {
          await supabaseAdmin
            .from('organisations')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', org.id)
        }
        break
      }
    }

    // Stocker l'événement brut pour audit
    await supabaseAdmin.from('admin_audit_log').insert({
      action: `stripe_event_${event.type}`,
      target_type: 'stripe',
      after_state: { event_id: event.id, type: event.type },
    })

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[stripe-webhook]', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})

async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<boolean> {
  try {
    const parts     = Object.fromEntries(header.split(',').map(p => p.split('=')))
    const timestamp = parts['t']
    const v1        = parts['v1']
    if (!timestamp || !v1) return false

    const signed  = `${timestamp}.${payload}`
    const key     = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    )
    const sig     = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed))
    const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
    return computed === v1
  } catch {
    return false
  }
}
