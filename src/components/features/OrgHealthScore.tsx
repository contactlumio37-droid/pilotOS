import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export interface HealthDimension {
  id: string
  label: string
  weight: number
  enabled: boolean
  threshold_green: number
  threshold_amber: number
}

export interface HealthScoreConfig {
  enabled: boolean
  dimensions: HealthDimension[]
}

export const DEFAULT_HEALTH_CONFIG: HealthScoreConfig = {
  enabled: true,
  dimensions: [
    { id: 'actions_on_time',    label: 'Actions à jour',    weight: 25, enabled: true, threshold_green: 80, threshold_amber: 60 },
    { id: 'processes_reviewed', label: 'Processus révisés', weight: 25, enabled: true, threshold_green: 80, threshold_amber: 60 },
    { id: 'docs_valid',         label: 'Documents valides', weight: 25, enabled: true, threshold_green: 90, threshold_amber: 70 },
    { id: 'kpis_met',           label: 'KPIs atteints',     weight: 25, enabled: true, threshold_green: 75, threshold_amber: 50 },
  ],
}

export function useHealthScoreConfig() {
  const { organisation } = useAuth()

  return useQuery({
    queryKey: ['health_score_config', organisation?.id],
    enabled: !!organisation,
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('organisations')
        .select('health_score_config')
        .eq('id', organisation!.id)
        .maybeSingle()
      if (!data?.health_score_config) return DEFAULT_HEALTH_CONFIG
      return data.health_score_config as unknown as HealthScoreConfig
    },
  })
}

export function useSaveHealthScoreConfig() {
  const qc = useQueryClient()
  const { organisation } = useAuth()

  return useMutation({
    mutationFn: async (config: HealthScoreConfig) => {
      const { error } = await supabase
        .from('organisations')
        .update({ health_score_config: config as unknown as Record<string, unknown> })
        .eq('id', organisation!.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health_score_config'] })
      qc.invalidateQueries({ queryKey: ['org_health'] })
    },
  })
}

function CircularGauge({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={10} />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text
        x={size/2} y={size/2}
        textAnchor="middle"
        dominantBaseline="central"
        className="rotate-90"
        style={{ transform: `rotate(90deg) translate(0, 0)`, transformOrigin: `${size/2}px ${size/2}px`, fontSize: 24, fontWeight: 700, fill: '#0f172a' }}
      >
        {score}
      </text>
    </svg>
  )
}

export default function OrgHealthScore() {
  const { organisation } = useAuth()
  const { data: config = DEFAULT_HEALTH_CONFIG } = useHealthScoreConfig()

  const { data, isLoading } = useQuery({
    queryKey: ['org_health', organisation?.id, config],
    enabled: !!organisation && config.enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const orgId = organisation!.id
      const twelveMonthsAgo = new Date()
      twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)

      const [actions, processes, documents, indicators] = await Promise.all([
        supabase.from('actions').select('status').eq('organisation_id', orgId).not('status', 'eq', 'cancelled'),
        supabase.from('processes').select('id, last_review_date').eq('organisation_id', orgId),
        supabase.from('documents').select('status').eq('organisation_id', orgId),
        supabase.from('indicators').select('id, target_value').eq('organisation_id', orgId),
      ])

      const allActions = actions.data ?? []
      const onTime = allActions.filter(a => a.status !== 'late').length
      const actionsOnTime = allActions.length > 0 ? Math.round((onTime / allActions.length) * 100) : 100

      const allProcesses = processes.data ?? []
      const reviewed = allProcesses.filter(p =>
        p.last_review_date && new Date(p.last_review_date) >= twelveMonthsAgo
      ).length
      const processesReviewed = allProcesses.length > 0 ? Math.round((reviewed / allProcesses.length) * 100) : 100

      const allDocs = documents.data ?? []
      const current = allDocs.filter(d => d.status === 'active' || d.status === 'approved').length
      const docsValid = allDocs.length > 0 ? Math.round((current / allDocs.length) * 100) : 100

      const allInds = indicators.data ?? []
      const withTarget = allInds.filter(i => i.target_value != null)
      let kpisMet = 100
      if (withTarget.length > 0) {
        const results = await Promise.all(
          withTarget.map(i =>
            supabase
              .from('indicator_values')
              .select('value')
              .eq('indicator_id', i.id)
              .order('measured_at', { ascending: false })
              .limit(1)
              .maybeSingle()
              .then(r => r.data?.value ?? null)
          )
        )
        const reached = results.filter((v, idx) => v !== null && v >= withTarget[idx].target_value!).length
        kpisMet = Math.round((reached / withTarget.length) * 100)
      }

      return { actions_on_time: actionsOnTime, processes_reviewed: processesReviewed, docs_valid: docsValid, kpis_met: kpisMet }
    },
  })

  if (!config.enabled) return null

  const enabledDims = config.dimensions.filter(d => d.enabled)
  const totalWeight = enabledDims.reduce((s, d) => s + d.weight, 0)

  const dimValues: Record<string, number> = {
    actions_on_time:    data?.actions_on_time    ?? 0,
    processes_reviewed: data?.processes_reviewed ?? 0,
    docs_valid:         data?.docs_valid         ?? 0,
    kpis_met:           data?.kpis_met           ?? 0,
  }

  const score = totalWeight > 0
    ? Math.round(
        enabledDims.reduce((sum, d) => sum + (dimValues[d.id] ?? 0) * (d.weight / totalWeight), 0)
      )
    : 0

  if (isLoading) return <div className="card animate-pulse h-44" />

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Score de santé organisationnelle</h3>
      <div className="flex items-center gap-6">
        <div className="relative flex items-center justify-center">
          <CircularGauge score={score} size={120} />
          <span className="absolute bottom-3 text-xs text-slate-500 font-medium">/100</span>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-3">
          {enabledDims.map(d => {
            const value = dimValues[d.id] ?? 0
            const colorClass = value >= d.threshold_green
              ? 'text-emerald-600'
              : value >= d.threshold_amber
                ? 'text-amber-600'
                : 'text-red-600'
            const barClass = value >= d.threshold_green
              ? 'bg-emerald-500'
              : value >= d.threshold_amber
                ? 'bg-amber-400'
                : 'bg-red-500'
            return (
              <div key={d.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">{d.label}</span>
                  <span className={`text-xs font-semibold ${colorClass}`}>{value}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${barClass}`}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
