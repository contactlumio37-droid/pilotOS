import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Json } from '@/types/database'

export type KpiId =
  | 'actions_todo'
  | 'actions_in_progress'
  | 'actions_late'
  | 'actions_done_month'
  | 'nc_open'
  | 'nc_critical'
  | 'terrain_pending'
  | 'projects_active'
  | 'processes_health_avg'

export interface KpiValue {
  id: KpiId
  label: string
  value: number
  target?: number
  unit?: string
  variant: 'success' | 'warning' | 'danger' | 'neutral' | 'brand'
  trend?: 'up' | 'down' | 'stable'
}

export interface KpiConfig {
  enabled: KpiId[]
  order: KpiId[]
}

export const DEFAULT_KPI_CONFIG: KpiConfig = {
  enabled: ['actions_todo', 'actions_in_progress', 'actions_late', 'nc_open', 'terrain_pending', 'projects_active'],
  order:   ['actions_todo', 'actions_in_progress', 'actions_late', 'nc_open', 'terrain_pending', 'projects_active'],
}

export const ALL_KPI_DEFINITIONS: Record<KpiId, { label: string; variant: KpiValue['variant'] }> = {
  actions_todo:         { label: 'À faire',              variant: 'brand' },
  actions_in_progress:  { label: 'En cours',             variant: 'neutral' },
  actions_late:         { label: 'En retard',            variant: 'danger' },
  actions_done_month:   { label: 'Terminées ce mois',    variant: 'success' },
  nc_open:              { label: 'NC ouvertes',          variant: 'warning' },
  nc_critical:          { label: 'NC critiques',         variant: 'danger' },
  terrain_pending:      { label: 'Signalements terrain', variant: 'warning' },
  projects_active:      { label: 'Projets actifs',       variant: 'brand' },
  processes_health_avg: { label: 'Santé processus moy.', variant: 'neutral' },
}

export function useDashboardKPIs(kpiConfig?: KpiConfig) {
  const { organisation } = useAuth()
  const config = kpiConfig ?? DEFAULT_KPI_CONFIG

  return useQuery({
    queryKey: ['dashboard-kpis', organisation?.id, config.enabled],
    enabled: !!organisation,
    staleTime: 60_000,
    queryFn: async () => {
      const orgId = organisation!.id
      const now = new Date()
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

      const requests: PromiseLike<{ id: KpiId; count: number }>[] = []

      const ids = config.enabled

      if (ids.includes('actions_todo')) {
        requests.push(
          supabase.from('actions').select('*', { count: 'exact', head: true })
            .eq('organisation_id', orgId).eq('status', 'todo')
            .then(r => ({ id: 'actions_todo' as KpiId, count: r.count ?? 0 }))
        )
      }
      if (ids.includes('actions_in_progress')) {
        requests.push(
          supabase.from('actions').select('*', { count: 'exact', head: true })
            .eq('organisation_id', orgId).eq('status', 'in_progress')
            .then(r => ({ id: 'actions_in_progress' as KpiId, count: r.count ?? 0 }))
        )
      }
      if (ids.includes('actions_late')) {
        requests.push(
          supabase.from('actions').select('*', { count: 'exact', head: true })
            .eq('organisation_id', orgId).eq('status', 'late')
            .then(r => ({ id: 'actions_late' as KpiId, count: r.count ?? 0 }))
        )
      }
      if (ids.includes('actions_done_month')) {
        requests.push(
          supabase.from('actions').select('*', { count: 'exact', head: true })
            .eq('organisation_id', orgId).eq('status', 'done')
            .gte('completed_at', firstOfMonth)
            .then(r => ({ id: 'actions_done_month' as KpiId, count: r.count ?? 0 }))
        )
      }
      if (ids.includes('nc_open')) {
        requests.push(
          supabase.from('non_conformities').select('*', { count: 'exact', head: true })
            .eq('organisation_id', orgId).in('status', ['open', 'in_treatment'])
            .then(r => ({ id: 'nc_open' as KpiId, count: r.count ?? 0 }))
        )
      }
      if (ids.includes('nc_critical')) {
        requests.push(
          supabase.from('non_conformities').select('*', { count: 'exact', head: true })
            .eq('organisation_id', orgId).eq('severity', 'critical').in('status', ['open', 'in_treatment'])
            .then(r => ({ id: 'nc_critical' as KpiId, count: r.count ?? 0 }))
        )
      }
      if (ids.includes('terrain_pending')) {
        requests.push(
          supabase.from('terrain_reports').select('*', { count: 'exact', head: true })
            .eq('organisation_id', orgId).eq('status', 'pending')
            .then(r => ({ id: 'terrain_pending' as KpiId, count: r.count ?? 0 }))
        )
      }
      if (ids.includes('projects_active')) {
        requests.push(
          supabase.from('projects').select('*', { count: 'exact', head: true })
            .eq('organisation_id', orgId).eq('status', 'active')
            .then(r => ({ id: 'projects_active' as KpiId, count: r.count ?? 0 }))
        )
      }
      if (ids.includes('processes_health_avg')) {
        requests.push(
          supabase.from('processes').select('health_score')
            .eq('organisation_id', orgId).eq('status', 'active').not('health_score', 'is', null)
            .then(r => {
              const scores = (r.data ?? []).map((p: { health_score: number | null }) => p.health_score ?? 0)
              const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
              return { id: 'processes_health_avg' as KpiId, count: avg }
            })
        )
      }

      const results = await Promise.all(requests)
      const byId = Object.fromEntries(results.map(r => [r.id, r.count]))

      return config.order
        .filter(id => config.enabled.includes(id))
        .map(id => {
          const def = ALL_KPI_DEFINITIONS[id]
          const value = byId[id] ?? 0
          let variant = def.variant
          if (id === 'actions_late' && value > 0) variant = 'danger'
          if (id === 'nc_critical' && value > 0) variant = 'danger'
          return { id, label: def.label, value, variant } as KpiValue
        })
    },
  })
}

export function useKpiConfig() {
  const { organisation } = useAuth()

  return useQuery({
    queryKey: ['kpi-config', organisation?.id],
    enabled: !!organisation,
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organisation_members')
        .select('kpi_config')
        .eq('organisation_id', organisation!.id)
        .limit(1)
        .maybeSingle()
      if (error) return DEFAULT_KPI_CONFIG
      const raw = data?.kpi_config as Json
      if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'enabled' in raw) {
        return raw as unknown as KpiConfig
      }
      return DEFAULT_KPI_CONFIG
    },
  })
}

export function useSaveKpiConfig() {
  const qc = useQueryClient()
  const { organisation } = useAuth()

  return useMutation({
    mutationFn: async (config: KpiConfig) => {
      const { error } = await supabase
        .from('organisation_members')
        .update({ kpi_config: config as unknown as Json })
        .eq('organisation_id', organisation!.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kpi-config'] })
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] })
    },
  })
}
