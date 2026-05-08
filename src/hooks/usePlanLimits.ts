import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { FREE_LIMITS } from '@/lib/stripe'
import { useAuth } from './useAuth'
import { useStripeCheckout } from './useStripeCheckout'

export interface FeatureLimit {
  count: number
  max: number
  isOver: boolean
  pct: number
}

export interface PlanLimitsResult {
  actions: FeatureLimit
  processes: FeatureLimit
  documents: FeatureLimit
  aiUsage: FeatureLimit
  isFreePlan: boolean
  isOverAnyLimit: boolean
  checkout: (plan?: 'team') => Promise<void>
  loading: boolean
}

function limit(count: number, max: number): FeatureLimit {
  return { count, max, isOver: count >= max, pct: Math.min(100, Math.round((count / max) * 100)) }
}

export function usePlanLimits(): PlanLimitsResult {
  const { organisation } = useAuth()
  const { checkout, loading: checkoutLoading } = useStripeCheckout()

  const isFreePlan = organisation?.plan === 'free'

  const { data: counts, isLoading } = useQuery({
    queryKey: ['plan_limits', organisation?.id],
    enabled: !!organisation && isFreePlan,
    staleTime: 60_000,
    queryFn: async () => {
      const orgId = organisation!.id
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [actions, processes, documents, ai] = await Promise.all([
        supabase
          .from('actions')
          .select('id', { count: 'exact', head: true })
          .eq('organisation_id', orgId)
          .not('status', 'eq', 'cancelled'),
        supabase
          .from('processes')
          .select('id', { count: 'exact', head: true })
          .eq('organisation_id', orgId),
        supabase
          .from('documents')
          .select('id', { count: 'exact', head: true })
          .eq('organisation_id', orgId),
        supabase
          .from('ai_usage')
          .select('id', { count: 'exact', head: true })
          .eq('organisation_id', orgId)
          .gte('created_at', monthStart),
      ])

      return {
        actions:   actions.count ?? 0,
        processes: processes.count ?? 0,
        documents: documents.count ?? 0,
        aiUsage:   ai.count ?? 0,
      }
    },
  })

  const actionsLimit   = limit(counts?.actions ?? 0,   FREE_LIMITS.max_actions)
  const processesLimit = limit(counts?.processes ?? 0, FREE_LIMITS.max_processes)
  const documentsLimit = limit(counts?.documents ?? 0, FREE_LIMITS.max_documents)
  const aiLimit        = limit(counts?.aiUsage ?? 0,   FREE_LIMITS.ai_per_month)

  return {
    actions:       actionsLimit,
    processes:     processesLimit,
    documents:     documentsLimit,
    aiUsage:       aiLimit,
    isFreePlan,
    isOverAnyLimit: isFreePlan && (actionsLimit.isOver || processesLimit.isOver || documentsLimit.isOver || aiLimit.isOver),
    checkout:      () => checkout('team'),
    loading:       isLoading || checkoutLoading,
  }
}
