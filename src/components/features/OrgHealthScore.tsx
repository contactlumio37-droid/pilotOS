import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface HealthData {
  actionsOnTime: number  // % actions done or in_progress not late
  processCompliance: number  // % processes with last_review in 12 months
  documentCurrent: number  // % documents with status 'current'
  kpiReached: number  // % indicators with latest value >= target
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

  const { data, isLoading } = useQuery({
    queryKey: ['org_health', organisation?.id],
    enabled: !!organisation,
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

      // 1. Actions on time
      const allActions = actions.data ?? []
      const onTime = allActions.filter(a => a.status !== 'late').length
      const actionsOnTime = allActions.length > 0 ? Math.round((onTime / allActions.length) * 100) : 100

      // 2. Process compliance (reviewed in last 12 months)
      const allProcesses = processes.data ?? []
      const reviewed = allProcesses.filter(p =>
        p.last_review_date && new Date(p.last_review_date) >= twelveMonthsAgo
      ).length
      const processCompliance = allProcesses.length > 0 ? Math.round((reviewed / allProcesses.length) * 100) : 100

      // 3. Documents current
      const allDocs = documents.data ?? []
      const current = allDocs.filter(d => d.status === 'current' || d.status === 'approved').length
      const documentCurrent = allDocs.length > 0 ? Math.round((current / allDocs.length) * 100) : 100

      // 4. KPIs reaching target
      const allInds = indicators.data ?? []
      const withTarget = allInds.filter(i => i.target_value != null)
      let kpiReached = 100
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
        kpiReached = Math.round((reached / withTarget.length) * 100)
      }

      return { actionsOnTime, processCompliance, documentCurrent, kpiReached } satisfies HealthData
    },
  })

  const score = data
    ? Math.round((data.actionsOnTime + data.processCompliance + data.documentCurrent + data.kpiReached) / 4)
    : 0

  const dims = [
    { label: 'Actions à jour', value: data?.actionsOnTime ?? 0 },
    { label: 'Processus révisés', value: data?.processCompliance ?? 0 },
    { label: 'Documents valides', value: data?.documentCurrent ?? 0 },
    { label: 'KPIs atteints', value: data?.kpiReached ?? 0 },
  ]

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
          {dims.map(d => (
            <div key={d.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">{d.label}</span>
                <span className={`text-xs font-semibold ${d.value >= 80 ? 'text-emerald-600' : d.value >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                  {d.value}%
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${d.value >= 80 ? 'bg-emerald-500' : d.value >= 60 ? 'bg-amber-400' : 'bg-red-500'}`}
                  style={{ width: `${d.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
