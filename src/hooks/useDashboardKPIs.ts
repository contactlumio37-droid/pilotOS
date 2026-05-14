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
  // Nouveaux KPIs disponibles via Edge Function
  | 'incidents_open'
  | 'duer_critical_risks'
  | 'docs_to_review'

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
  incidents_open:       { label: 'Incidents ouverts',    variant: 'danger' },
  duer_critical_risks:  { label: 'Risques DUER critiques', variant: 'danger' },
  docs_to_review:       { label: 'Docs à réviser',       variant: 'warning' },
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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dashboard-kpis`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            organisation_id: orgId,
            kpi_ids: config.enabled,
          }),
        }
      )

      if (!response.ok) throw new Error('dashboard-kpis failed')
      const { kpis } = await response.json() as { kpis: Record<string, number> }

      return config.order
        .filter(id => config.enabled.includes(id))
        .map(id => {
          const def = ALL_KPI_DEFINITIONS[id]
          const value = kpis[id] ?? 0
          let variant = def.variant
          if (id === 'actions_late' && value > 0) variant = 'danger'
          if (id === 'nc_critical' && value > 0) variant = 'danger'
          if (id === 'duer_critical_risks' && value > 0) variant = 'danger'
          return { id, label: def.label, value, variant } as KpiValue
        })
    },
  })
}

export function useKpiConfig() {
  const { organisation, user } = useAuth()

  return useQuery({
    queryKey: ['kpi-config', organisation?.id, user?.id],
    enabled: !!organisation && !!user,
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organisation_members')
        .select('kpi_config')
        .eq('organisation_id', organisation!.id)
        .eq('user_id', user!.id)
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
  const { organisation, user } = useAuth()

  return useMutation({
    mutationFn: async (config: KpiConfig) => {
      const { error } = await supabase
        .from('organisation_members')
        .update({ kpi_config: config as unknown as Json })
        .eq('organisation_id', organisation!.id)
        .eq('user_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kpi-config'] })
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] })
    },
  })
}
