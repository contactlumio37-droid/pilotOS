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
  | 'incidents_open'
  | 'duer_critical_risks'
  | 'docs_to_review'
  // Nouveaux KPIs Sprint 0.3
  | 'actions_completion_rate'
  | 'actions_avg_resolution_days'
  | 'nc_recurrence_rate'
  | 'workload_per_user'
  | 'docs_review_compliance_rate'
  | 'kaizen_velocity'
  | 'processes_up_to_date_rate'

export interface KpiValue {
  id: KpiId
  label: string
  value: number
  target?: number
  unit?: string
  variant: 'success' | 'warning' | 'danger' | 'neutral' | 'brand'
  trend?: 'up' | 'down' | 'stable'
  tooltip?: string
  status?: 'green' | 'amber' | 'red'
}

export interface KpiConfig {
  enabled: KpiId[]
  order: KpiId[]
}

export interface KpiDefinition {
  label: string
  variant: KpiValue['variant']
  unit?: string
  tooltip?: string
  thresholds?: { green: number; amber: number }
}

export const DEFAULT_KPI_CONFIG: KpiConfig = {
  enabled: ['actions_todo', 'actions_in_progress', 'actions_late', 'nc_open', 'terrain_pending', 'projects_active'],
  order:   ['actions_todo', 'actions_in_progress', 'actions_late', 'nc_open', 'terrain_pending', 'projects_active'],
}

export const ALL_KPI_DEFINITIONS: Record<KpiId, KpiDefinition> = {
  actions_todo:         { label: 'À faire',              variant: 'brand',    tooltip: 'Actions au statut "À faire"' },
  actions_in_progress:  { label: 'En cours',             variant: 'neutral',  tooltip: 'Actions en cours de traitement' },
  actions_late:         { label: 'En retard',            variant: 'danger',   tooltip: 'Actions dont la date d\'échéance est dépassée', thresholds: { green: 0, amber: 3 } },
  actions_done_month:   { label: 'Terminées ce mois',    variant: 'success',  tooltip: 'Actions clôturées depuis le début du mois' },
  nc_open:              { label: 'NC ouvertes',          variant: 'warning',  tooltip: 'Non-conformités ouvertes ou en traitement', thresholds: { green: 0, amber: 5 } },
  nc_critical:          { label: 'NC critiques',         variant: 'danger',   tooltip: 'Non-conformités de sévérité critique', thresholds: { green: 0, amber: 1 } },
  terrain_pending:      { label: 'Signalements terrain', variant: 'warning',  tooltip: 'Signalements terrain en attente de traitement' },
  projects_active:      { label: 'Projets actifs',       variant: 'brand',    tooltip: 'Projets stratégiques en cours' },
  processes_health_avg: { label: 'Santé processus moy.', variant: 'neutral',  unit: '%', tooltip: 'Score de santé moyen des processus actifs', thresholds: { green: 80, amber: 60 } },
  incidents_open:       { label: 'Incidents ouverts',    variant: 'danger',   tooltip: 'Incidents ouverts ou en analyse', thresholds: { green: 0, amber: 3 } },
  duer_critical_risks:  { label: 'Risques DUER critiques', variant: 'danger', tooltip: 'Risques DUER avec score ≥ 80', thresholds: { green: 0, amber: 2 } },
  docs_to_review:       { label: 'Docs à réviser',       variant: 'warning',  tooltip: 'Documents dont la date de révision est dépassée' },
  // Nouveaux KPIs
  actions_completion_rate: {
    label: 'Taux de clôture actions',
    variant: 'success',
    unit: '%',
    tooltip: 'Pourcentage d\'actions terminées sur le total des actions de l\'organisation',
    thresholds: { green: 70, amber: 50 },
  },
  actions_avg_resolution_days: {
    label: 'Délai moyen de résolution',
    variant: 'neutral',
    unit: 'j',
    tooltip: 'Nombre de jours moyen entre la création et la clôture d\'une action',
    thresholds: { green: 14, amber: 30 },
  },
  nc_recurrence_rate: {
    label: 'Taux de récurrence NC',
    variant: 'warning',
    unit: '%',
    tooltip: 'Pourcentage de NC liées à une cause racine déjà identifiée dans d\'autres NC',
    thresholds: { green: 10, amber: 25 },
  },
  workload_per_user: {
    label: 'Charge par membre',
    variant: 'neutral',
    tooltip: 'Nombre d\'actions actives (à faire + en cours) par membre actif',
    thresholds: { green: 5, amber: 10 },
  },
  docs_review_compliance_rate: {
    label: 'Conformité révisions docs',
    variant: 'success',
    unit: '%',
    tooltip: 'Pourcentage de documents dont la prochaine révision n\'est pas encore dépassée',
    thresholds: { green: 90, amber: 70 },
  },
  kaizen_velocity: {
    label: 'Vélocité Kaizen',
    variant: 'brand',
    tooltip: 'Nombre d\'actions Kaizen clôturées sur le mois en cours',
    thresholds: { green: 3, amber: 1 },
  },
  processes_up_to_date_rate: {
    label: 'Processus à jour',
    variant: 'success',
    unit: '%',
    tooltip: 'Pourcentage de processus actifs révisés dans les 12 derniers mois',
    thresholds: { green: 80, amber: 60 },
  },
}

function computeStatus(id: KpiId, value: number): 'green' | 'amber' | 'red' | undefined {
  const def = ALL_KPI_DEFINITIONS[id]
  if (!def.thresholds) return undefined
  const { green, amber } = def.thresholds
  // For "lower is better" KPIs (late, NCs, recurrence...)
  const lowerIsBetter = ['actions_late', 'nc_open', 'nc_critical', 'incidents_open',
    'duer_critical_risks', 'nc_recurrence_rate', 'workload_per_user',
    'actions_avg_resolution_days'].includes(id)
  if (lowerIsBetter) {
    if (value <= green) return 'green'
    if (value <= amber) return 'amber'
    return 'red'
  }
  if (value >= green) return 'green'
  if (value >= amber) return 'amber'
  return 'red'
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
          body: JSON.stringify({ organisation_id: orgId, kpi_ids: config.enabled }),
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
          return {
            id,
            label: def.label,
            value,
            unit: def.unit,
            variant,
            tooltip: def.tooltip,
            status: computeStatus(id, value),
          } as KpiValue
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
