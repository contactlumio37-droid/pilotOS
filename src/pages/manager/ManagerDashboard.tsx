import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Settings2, AlertCircle, ArrowRight, ChevronRight, Inbox } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import PageHeader from '@/components/layout/PageHeader'
import KPIConfigDrawer from '@/components/modules/KPIConfigDrawer'
import { OriginBadge, StatusBadge } from '@/components/modules/ActionBadges'
import { useDashboardKPIs, useKpiConfig } from '@/hooks/useDashboardKPIs'
import { useActions } from '@/hooks/useActions'
import { useProjects } from '@/hooks/usePilotage'
import { useHasModule } from '@/hooks/useOrganisation'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { TerrainReport } from '@/types/database'

const VARIANT_CLASSES = {
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  danger:  'bg-danger-light text-danger',
  brand:   'bg-brand-100 text-brand-700',
  neutral: 'bg-slate-100 text-slate-600',
}

const CATEGORY_EMOJI: Record<string, string> = {
  safety: '⚠️', quality: '⭐', equipment: '🔧', process: '🔄', other: '📋',
}

export default function ManagerDashboard() {
  const [configOpen, setConfigOpen] = useState(false)
  const { organisation } = useAuth()
  const hasTerrainModule = useHasModule('terrain')

  const { data: kpiConfig } = useKpiConfig()
  const { data: kpis = [], isLoading: kpisLoading } = useDashboardKPIs(kpiConfig ?? undefined)
  const { data: actions = [] } = useActions()
  const { data: projects = [] } = useProjects()

  const { data: pendingReports = [] } = useQuery({
    queryKey: ['terrain-pending-manager', organisation?.id],
    enabled: !!organisation && hasTerrainModule,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('terrain_reports')
        .select('*')
        .eq('organisation_id', organisation!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data as TerrainReport[]
    },
  })

  const recentActions = actions.filter(a => !['done', 'cancelled'].includes(a.status)).slice(0, 6)
  const activeProjects = projects.filter(p => p.status === 'active').slice(0, 4)

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Vue d'ensemble"
        actions={
          <button onClick={() => setConfigOpen(true)} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Settings2 className="w-4 h-4" />
            Configurer
          </button>
        }
      />

      {/* KPI Cards */}
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {kpisLoading
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="card animate-pulse h-24" />)
          : kpis.map(kpi => (
              <div key={kpi.id} className="card">
                <p className="text-sm text-slate-500 mb-1">{kpi.label}</p>
                <p className={`text-3xl font-bold ${kpi.variant === 'danger' && kpi.value > 0 ? 'text-danger' : 'text-slate-900'}`}>
                  {kpi.value}
                  {kpi.unit && <span className="text-base font-normal text-slate-400 ml-1">{kpi.unit}</span>}
                </p>
                {kpi.variant !== 'neutral' && kpi.value > 0 && (
                  <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${VARIANT_CLASSES[kpi.variant]}`}>
                    {kpi.variant === 'danger' ? '⚠ Attention' : kpi.variant === 'warning' ? 'À surveiller' : ''}
                  </span>
                )}
              </div>
            ))
        }
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Signalements terrain */}
        {hasTerrainModule && (
          <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }} className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-warning" />
                Signalements terrain
              </h2>
              <Link to="/manager/terrain" className="text-xs text-brand-600 hover:underline flex items-center gap-0.5">
                Voir tout <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {pendingReports.length === 0 ? (
              <div className="text-center py-6">
                <Inbox className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Aucun signalement en attente — terrain opérationnel ✓</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingReports.map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                    <span className="text-lg">{CATEGORY_EMOJI[r.category]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{r.title}</p>
                      {r.location && <p className="text-xs text-slate-400 truncate">{r.location}</p>}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {format(new Date(r.created_at), 'd MMM', { locale: fr })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Projets actifs */}
        <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Projets en cours</h2>
            <Link to="/manager/strategie" className="text-xs text-brand-600 hover:underline flex items-center gap-0.5">
              Stratégie <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {activeProjects.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-slate-400">Aucun projet en cours.</p>
              <Link to="/manager/strategie" className="btn-primary mt-3 text-sm inline-flex">Ajouter un objectif</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeProjects.map(p => {
                const total = actions.filter(a => a.project_id === p.id).length
                const done  = actions.filter(a => a.project_id === p.id && a.status === 'done').length
                const pct   = total > 0 ? Math.round((done / total) * 100) : 0
                return (
                  <div key={p.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700 truncate flex-1">{p.title}</span>
                      <span className="text-slate-400 shrink-0 ml-2">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Actions récentes */}
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="card mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Actions en cours</h2>
          <Link to="/manager/actions" className="text-xs text-brand-600 hover:underline flex items-center gap-0.5">
            Toutes les actions <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {recentActions.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">Toutes les actions sont à jour — excellent travail !</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentActions.map(a => (
              <div key={a.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{a.title}</p>
                  {a.due_date && (
                    <p className="text-xs text-slate-400">
                      Échéance {format(new Date(a.due_date), 'd MMM', { locale: fr })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <OriginBadge origin={a.origin} />
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <KPIConfigDrawer open={configOpen} onClose={() => setConfigOpen(false)} />
    </div>
  )
}
