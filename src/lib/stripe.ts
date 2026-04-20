// PilotOS — Wrapper Stripe (liens de paiement + webhooks via Edge Functions)

import { supabase } from './supabase'

export const PLANS = {
  free: { name: 'Free Solo', price: 0, seats: 1 },
  team: { name: 'Team', price: 59, seats: 10, extraSeatPrice: 6 },
  business: { name: 'Business', price: 119, seats: 25, extraSeatPrice: 5 },
  pro: { name: 'Pro', price: 199, seats: 50, extraSeatPrice: 4 },
  enterprise: { name: 'Enterprise', price: null, seats: null },
} as const

export type PlanKey = keyof typeof PLANS

// Crée une session de paiement Stripe (appel Edge Function)
export async function createCheckoutSession(params: {
  organisationId: string
  plan: PlanKey
  extraSeats?: number
  annual?: boolean
}): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke('stripe-checkout', {
    body: params,
  })
  if (error) throw new Error(`Erreur Stripe : ${error.message}`)
  return data
}

// Portail client Stripe (gestion abonnement)
export async function createBillingPortalSession(
  organisationId: string,
): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke('stripe-portal', {
    body: { organisation_id: organisationId },
  })
  if (error) throw new Error(`Erreur portail Stripe : ${error.message}`)
  return data
}

// Calcule le prix total pour un plan
export function calculatePlanPrice(
  plan: PlanKey,
  extraSeats = 0,
  annual = false,
): number {
  const planData = PLANS[plan]
  if (!planData.price) return 0

  const extraSeatPrice = 'extraSeatPrice' in planData ? planData.extraSeatPrice : 0
  const monthlyTotal = planData.price + extraSeats * extraSeatPrice
  return annual ? Math.round(monthlyTotal * 12 * 0.9) : monthlyTotal
}

// Limites par plan (Free Solo)
export const FREE_LIMITS = {
  max_actions: 10,
  max_processes: 3,
  max_documents: 5,
  ai_per_month: 5,
  pdf_exports_per_month: 1,
} as const
