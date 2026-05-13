import { motion } from 'framer-motion'
import { Lock, TrendingUp, Target, Activity } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import ActivityFeed from '@/components/features/ActivityFeed'
import { useDashboardKPIs } from '@/hooks/useDashboardKPIs'
import { useObjectives } from '@/hooks/usePilotage'
import type { KpiId } from '@/hooks/useDashboardKPIs'
import { differenceInDays, parseISO } from 'date-fns'

const DIRECTOR_KPIS: KpiId[] = [
  'actions_todo', 'actions_in_progress', 'actions_late',
  'projects_active', 'nc_open', 'processes_health_avg',
]
const DIRECTOR_CONFIG = { enabled: DIRECTOR_KPIS, order: DIRECTOR_KPIS }

const STATUS_LABELS = {
  draft:     { label: 'Brouillon', className: 'badge-neutral' },
  active:    { label: 'Actif',     className: 'badge-brand' },
  completed: { label: 'Atteint',   className: 'badge-success' },
  cancelled: { label: 'Annulé',    className: 'badge bg-slate-100 text-slate-400' },
}

function ObjectiveProgress({ obj }: { obj: { end_date?: string | null; start_date?: string | null; status: string } }) {
  if (!obj.start_date || !obj.end_date || obj.status !== 'active') return null
  const total = differenceInDays(parseISO(obj.end_date), parseISO(obj.start_date))
  const elapsed = differenceInDays(new Date(), parseISO(obj.start_date))
  const pct = Math.min(100, Math.max(0, Math.round((elapsed / Math.max(total, 1)) * 100)))
  const daysLeft = differenceInDays(parseISO(obj.end_date), new Date())
  const color = daysLeft < 0 ? 'bg-danger-500' : daysLeft < 30 ? 'bg-amber-400' : 'bg-brand-500'
  return (
    <div className="mt-3 pt-3 border-t border-slate-50">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-400">Avancement temporel</span>
        <span className={`text-xs font-semibold ${daysLeft < 0 ? 'text-danger-600' : daysLeft < 30 ? 'text-amber-600' : 'text-slate-600'}`}>
          {daysLeft < 0 ? `${Math.abs(daysLeft)} j dépassé` : `${daysLeft} j restants`}
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function DirectorDashboard() {
  const { data: kpis = [], isLoading } = useDashboardKPIs(DIRECTOR_CONFIG)
  const { data: objectives = [] } = useObjectives()
  const activeObjectives = objectives.filter(o => o.status === 'active').slice(0, 6)

  return (
    <div className="max-w-5xl">
      <PageHeader title="Synthèse direction" subtitle="Vue consolidée — lecture seule" />

      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="card animate-pulse h-24" />)
          : kpis.map(kpi => (
              <div key={kpi.id} className="card">
                <p className="text-sm text-slate-500 mb-1">{kpi.label}</p>
                <p className={`text-3xl font-bold ${kpi.variant === 'danger' && kpi.value > 0 ? 'text-danger' : 'text-slate-900'}`}>
                  {kpi.value}
                  {kpi.id === 'processes_health_avg' && <span className="text-base text-slate-400 ml-1">%</span>}
                </p>
              </div>
            ))
        }
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Objectives — takes 2 cols */}
        <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.08 }} className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-semibold text-slate-900">Objectifs stratégiques actifs</h2>
            <span className="text-xs text-slate-400">({activeObjectives.length})</span>
          </div>

          {activeObjectives.length === 0 ? (
            <div className="card text-center py-10">
              <TrendingUp className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Aucun objectif actif</p>
              <p className="text-sm text-slate-400 mt-1">Les objectifs apparaîtront ici une fois créés.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {activeObjectives.map(obj => {
                const st = STATUS_LABELS[obj.status]
                return (
                  <motion.div key={obj.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {obj.visibility !== 'public' && <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                          <span className="text-sm font-semibold text-slate-900">{obj.title}</span>
                        </div>
                        {obj.axis && <p className="text-xs text-slate-400 mb-1">{obj.axis}</p>}
                        {obj.description && <p className="text-sm text-slate-500 line-clamp-2">{obj.description}</p>}
                      </div>
                      <span className={st.className}>{st.label}</span>
                    </div>
                    {obj.kpi_label && (
                      <div className="mt-2 flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                        <span className="text-xs text-slate-500">{obj.kpi_label}</span>
                        {obj.kpi_target && (
                          <span className="text-xs font-semibold text-slate-700 ml-auto">
                            Cible : {obj.kpi_target}{obj.kpi_unit ? ` ${obj.kpi_unit}` : ''}
                          </span>
                        )}
                      </div>
                    )}
                    <ObjectiveProgress obj={obj} />
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Activity feed — 1 col */}
        <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12 }}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-semibold text-slate-900">Activité récente</h2>
          </div>
          <div className="card">
            <ActivityFeed limit={8} />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
