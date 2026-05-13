import { useQuery } from '@tanstack/react-query'
import { CreditCard, Users, Zap, ExternalLink, CheckCircle, TrendingUp } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { useOrganisation } from '@/hooks/useOrganisation'
import { useOrgMembers } from '@/hooks/useMembers'
import { useStripeCheckout } from '@/hooks/useStripeCheckout'
import { PLANS } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'
import type { PlanKey } from '@/lib/stripe'
import type { AiUsage } from '@/types/database'

const PLAN_FEATURES: Record<PlanKey, string[]> = {
  free:       ['1 utilisateur', '5 requêtes IA/mois', 'Modules de base'],
  team:       ['Jusqu\'à 10 utilisateurs', '50 requêtes IA/mois', 'Tous les modules', 'Support email'],
  business:   ['Jusqu\'à 25 utilisateurs', '200 requêtes IA/mois', 'Tous les modules', 'Support prioritaire', 'Export PDF'],
  pro:        ['Jusqu\'à 50 utilisateurs', 'IA illimitée', 'Tous les modules', 'Support dédié', 'SLA 99,9 %'],
  enterprise: ['Utilisateurs illimités', 'IA illimitée', 'SSO / SAML', 'Déploiement sur site', 'Support enterprise'],
}

const PLAN_ORDER: PlanKey[] = ['free', 'team', 'business', 'pro', 'enterprise']

function planRank(plan: PlanKey): number {
  return PLAN_ORDER.indexOf(plan)
}

export default function BillingPage() {
  const { organisation } = useOrganisation()
  const { data: members = [] } = useOrgMembers(organisation?.id)
  const { checkout, openPortal, loading } = useStripeCheckout()

  const currentPlan = (organisation?.plan ?? 'free') as PlanKey
  const planMeta    = PLANS[currentPlan]
  const totalSeats  = (organisation?.seats_included ?? 1) + (organisation?.seats_extra ?? 0)
  const activeSeats = members.length

  const { data: aiUsage = [] } = useQuery({
    queryKey: ['ai_usage', organisation?.id],
    enabled: !!organisation,
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date()
      since.setDate(1)
      since.setHours(0, 0, 0, 0)
      const { data, error } = await supabase
        .from('ai_usage')
        .select('*')
        .eq('organisation_id', organisation!.id)
        .gte('created_at', since.toISOString())
      if (error) throw error
      return data as AiUsage[]
    },
  })

  const AI_LIMITS: Record<PlanKey, number | null> = {
    free: 5, team: 50, business: 200, pro: null, enterprise: null,
  }
  const aiLimit      = AI_LIMITS[currentPlan]
  const aiUsedThisMonth = aiUsage.length
  const aiPercent    = aiLimit ? Math.min(100, Math.round((aiUsedThisMonth / aiLimit) * 100)) : 0

  async function handleUpgrade(plan: PlanKey) {
    await checkout(plan)
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Facturation"
        subtitle="Plan actuel, usage et gestion de l'abonnement"
      />

      {/* Current plan summary */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-5 h-5 text-brand-600" />
              <h2 className="font-semibold text-slate-800">Plan actuel</h2>
            </div>
            <p className="text-3xl font-bold text-slate-900 capitalize">{planMeta.name}</p>
            {planMeta.price !== null && planMeta.price > 0 && (
              <p className="text-slate-500 text-sm mt-0.5">{planMeta.price} € / mois</p>
            )}
            {planMeta.price === 0 && (
              <p className="text-slate-400 text-sm mt-0.5">Gratuit</p>
            )}
            {planMeta.price === null && (
              <p className="text-slate-500 text-sm mt-0.5">Sur devis</p>
            )}
          </div>

          {currentPlan !== 'free' && organisation?.stripe_subscription_id && (
            <button
              onClick={openPortal}
              disabled={loading}
              className="btn-secondary flex items-center gap-1.5 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Portail de facturation
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(PLAN_FEATURES[currentPlan] ?? []).map(f => (
            <span key={f} className="flex items-center gap-1 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-3 py-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Usage stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Seats */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-slate-500" />
            <p className="font-medium text-slate-700 text-sm">Sièges</p>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {activeSeats}
            <span className="text-base font-normal text-slate-400"> / {totalSeats}</span>
          </p>
          <div className="mt-3 bg-slate-100 rounded-full h-2">
            <div
              className="bg-brand-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.round((activeSeats / totalSeats) * 100))}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            {Math.max(0, totalSeats - activeSeats)} siège{totalSeats - activeSeats !== 1 ? 's' : ''} disponible{totalSeats - activeSeats !== 1 ? 's' : ''}
          </p>
        </div>

        {/* AI quota */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-slate-500" />
            <p className="font-medium text-slate-700 text-sm">Requêtes IA ce mois</p>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {aiUsedThisMonth}
            {aiLimit !== null && (
              <span className="text-base font-normal text-slate-400"> / {aiLimit}</span>
            )}
            {aiLimit === null && (
              <span className="text-base font-normal text-slate-400"> / ∞</span>
            )}
          </p>
          {aiLimit !== null && (
            <>
              <div className="mt-3 bg-slate-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${aiPercent >= 90 ? 'bg-red-400' : aiPercent >= 70 ? 'bg-amber-400' : 'bg-brand-600'}`}
                  style={{ width: `${aiPercent}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Remis à zéro le 1er du mois</p>
            </>
          )}
          {aiLimit === null && (
            <p className="text-xs text-slate-400 mt-3">Illimité sur ce plan</p>
          )}
        </div>
      </div>

      {/* Upgrade cards */}
      {currentPlan !== 'enterprise' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-brand-600" />
            <h2 className="font-semibold text-slate-700">Passer à un plan supérieur</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLAN_ORDER.filter(p => planRank(p) > planRank(currentPlan)).map(plan => {
              const meta     = PLANS[plan]
              const features = PLAN_FEATURES[plan]
              const isBest   = plan === 'business' || plan === 'pro'
              return (
                <div
                  key={plan}
                  className={`card p-5 flex flex-col gap-3 relative ${isBest ? 'ring-2 ring-brand-500' : ''}`}
                >
                  {isBest && (
                    <span className="absolute -top-2.5 left-4 badge badge-brand text-xs">Recommandé</span>
                  )}
                  <div>
                    <p className="font-semibold text-slate-800 capitalize">{meta.name}</p>
                    {meta.price !== null ? (
                      <p className="text-xl font-bold text-slate-900 mt-0.5">
                        {meta.price} €
                        <span className="text-sm font-normal text-slate-400"> /mois</span>
                      </p>
                    ) : (
                      <p className="text-xl font-bold text-slate-900 mt-0.5">Sur devis</p>
                    )}
                  </div>
                  <ul className="space-y-1 flex-1">
                    {features.map(f => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-slate-600">
                        <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {plan !== 'enterprise' ? (
                    <button
                      onClick={() => handleUpgrade(plan)}
                      disabled={loading}
                      className="btn-primary text-sm w-full"
                    >
                      Passer à {meta.name}
                    </button>
                  ) : (
                    <a
                      href="mailto:contact@pilotos.app"
                      className="btn-secondary text-sm w-full text-center"
                    >
                      Contacter l'équipe
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
