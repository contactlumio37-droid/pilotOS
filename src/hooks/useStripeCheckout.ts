import { useState } from 'react'
import type { PlanKey } from '@/lib/stripe'
import { startCheckout, openBillingPortal } from '@/services/stripe.service'
import { useAuth } from './useAuth'
import { useOrganisation } from './useOrganisation'

interface UseStripeCheckoutReturn {
  checkout: (plan: PlanKey, options?: { extraSeats?: number; annual?: boolean }) => Promise<void>
  openPortal: () => Promise<void>
  loading: boolean
  error: string | null
}

export function useStripeCheckout(): UseStripeCheckoutReturn {
  const { user } = useAuth()
  const { organisation } = useOrganisation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function checkout(
    plan: PlanKey,
    options: { extraSeats?: number; annual?: boolean } = {},
  ): Promise<void> {
    if (!organisation) {
      setError('Aucune organisation active')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await startCheckout({
        organisationId: organisation.id,
        plan,
        extraSeats: options.extraSeats,
        annual: options.annual,
        userId: user?.id,
      })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function openPortal(): Promise<void> {
    if (!organisation) {
      setError('Aucune organisation active')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await openBillingPortal({ organisationId: organisation.id, userId: user?.id })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return { checkout, openPortal, loading, error }
}
