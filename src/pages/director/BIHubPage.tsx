import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, Download } from 'lucide-react'
import { format, parseISO, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useOrganisation } from '@/hooks/useOrganisation'
import PlanGate from '@/components/features/PlanGate'
import type { KpiSnapshot } from '@/types/database'

type Period = '7d' | '30d' | '90d'

const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90 }
const PERIOD_LABELS: Record<Period, string> = { '7d': '7 jours', '30d': '30 jours', '90d': '90 jours' }

interface KpiSeries {
  kpi_id: string
  snapshots: KpiSnapshot[]
}

function trendIcon(snapshots: KpiSnapshot[]) {
  if (snapshots.length < 2) return <Minus className="w-4 h-4 text-slate-400" />
  const first = snapshots[0].value
  const last = snapshots[snapshots.length - 1].value
  const delta = last - first
  if (Math.abs(delta) < 0.01) return <Minus className="w-4 h-4 text-slate-400" />
  return delta > 0
    ? <TrendingUp className="w-4 h-4 text-green-500" />
    : <TrendingDown className="w-4 h-4 text-red-500" />
}

function sanitizeCsvCell(s: string) {
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
}

function exportCsv(series: KpiSeries[]) {
  const rows: string[][] = [['kpi_id', 'date', 'value', 'target']]
  for (const s of series) {
    for (const snap of s.snapshots) {
      rows.push([sanitizeCsvCell(s.kpi_id), snap.snapshot_date, String(snap.value), snap.target != null ? String(snap.target) : ''])
    }
  }
  const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kpi-export-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const CHART_COLORS = ['#444ce7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function BIHubPage() {
  const { organisation } = useOrganisation()
  const [period, setPeriod] = useState<Period>('30d')

  const since = subDays(new Date(), PERIOD_DAYS[period]).toISOString().slice(0, 10)

  const { data: snapshots = [], isLoading } = useQuery<KpiSnapshot[]>({
    queryKey: ['kpi_snapshots', organisation?.id, period],
    enabled: !!organisation?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_snapshots')
        .select('*')
        .eq('organisation_id', organisation!.id)
        .gte('snapshot_date', since)
        .order('snapshot_date', { ascending: true })
      if (error) throw error
      return (data ?? []) as KpiSnapshot[]
    },
  })

  const seriesMap = new Map<string, KpiSnapshot[]>()
  for (const snap of snapshots) {
    if (!seriesMap.has(snap.kpi_id)) seriesMap.set(snap.kpi_id, [])
    seriesMap.get(snap.kpi_id)!.push(snap)
  }
  const series: KpiSeries[] = [...seriesMap.entries()].map(([kpi_id, s]) => ({ kpi_id, snapshots: s }))

  // Build chart data: one object per date, keys = kpi_id
  const dateSet = new Set(snapshots.map(s => s.snapshot_date))
  const dates = [...dateSet].sort()
  const chartData = dates.map(date => {
    const row: Record<string, number | string> = {
      date: format(parseISO(date), 'd MMM', { locale: fr }),
    }
    for (const s of series) {
      const snap = s.snapshots.find(sn => sn.snapshot_date === date)
      if (snap) row[s.kpi_id] = snap.value
    }
    return row
  })

  if (!organisation) return null

  return (
    <PlanGate required="pro" featureName="BI & Tendances">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">BI & Tendances</h1>
            <p className="text-slate-500 text-sm mt-0.5">Historique des indicateurs clés</p>
          </div>
          <div className="flex items-center gap-2">
            {((['7d', '30d', '90d'] as Period[])).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
            {series.length > 0 && (
              <button
                onClick={() => exportCsv(series)}
                className="btn-secondary flex items-center gap-1.5 ml-2"
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : series.length === 0 ? (
          <div className="text-center py-20">
            <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Aucune donnée KPI disponible</p>
            <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
              Les snapshots sont alimentés automatiquement chaque jour par le cron Edge Function.
            </p>
          </div>
        ) : (
          <>
            {/* KPI summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
              {series.map((s, i) => {
                const last = s.snapshots[s.snapshots.length - 1]
                const color = CHART_COLORS[i % CHART_COLORS.length]
                return (
                  <div key={s.kpi_id} className="card" style={{ borderLeft: `4px solid ${color}` }}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-slate-500 font-medium truncate">{s.kpi_id}</p>
                      {trendIcon(s.snapshots)}
                    </div>
                    <p className="text-xl font-bold text-slate-900">{last.value.toLocaleString('fr-FR')}</p>
                    {last.target != null && (
                      <p className="text-xs text-slate-400 mt-0.5">Cible : {last.target.toLocaleString('fr-FR')}</p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Main chart */}
            <div className="card p-6">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} width={45} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {series.map((s, i) => (
                    <Line
                      key={s.kpi_id}
                      type="monotone"
                      dataKey={s.kpi_id}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      connectNulls
                    />
                  ))}
                  {series.map((s, i) => {
                    const snap = s.snapshots[s.snapshots.length - 1]
                    if (snap?.target == null) return null
                    return (
                      <ReferenceLine
                        key={`ref-${s.kpi_id}`}
                        y={snap.target}
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                        strokeDasharray="4 4"
                        opacity={0.5}
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </PlanGate>
  )
}
