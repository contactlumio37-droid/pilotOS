// Service layer for Stripe — wraps lib/stripe.ts with error logging
import { createCheckoutSession, createBillingPortalSession } from '@/lib/stripe'
import type { PlanKey } from '@/lib/stripe'
import { logEvent } from '@/lib/logger'

export async function startCheckout(params: {
  organisationId: string
  plan: PlanKey
  extraSeats?: number
  annual?: boolean
  userId?: string
}): Promise<void> {
  const { organisationId, plan, extraSeats, annual, userId } = params

  await logEvent({
    action: 'stripe_checkout_initiated',
    userId,
    organisationId,
    meta: { plan, extraSeats, annual },
  })

  const { url } = await createCheckoutSession({ organisationId, plan, extraSeats, annual })
  window.location.href = url
}

export async function openBillingPortal(params: {
  organisationId: string
  userId?: string
}): Promise<void> {
  const { organisationId, userId } = params

  await logEvent({
    action: 'stripe_portal_opened',
    userId,
    organisationId,
  })

  const { url } = await createBillingPortalSession(organisationId)
  window.location.href = url
}
