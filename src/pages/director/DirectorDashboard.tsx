import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, TrendingUp, Target, LayoutDashboard, Package, ShieldCheck } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import DashboardTabs from '@/components/layout/DashboardTabs'
import { useDashboardKPIs } from '@/hooks/useDashboardKPIs'
import { useObjectives } from '@/hooks/usePilotage'
import { useHasModule } from '@/hooks/useOrganisation'
import SecurityApp from '@/pages/shared/SecurityApp'
import { useNonConformities } from '@/hooks/useProcesses'
import { useProcesses } from '@/hooks/useProcesses'
import { Link } from 'react-router-dom'
import { ChevronRight, Inbox } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { KpiId } from '@/hooks/useDashboardKPIs'

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

const TAB_KEY = 'pilotos_director_dashboard_tab'

export default function DirectorDashboard() {
  const hasProcessus = useHasModule('processus')
  const hasSecurite  = useHasModule('securite')

  const [tab, setTab] = useState<string>(() =>
    sessionStorage.getItem(TAB_KEY) ?? 'pilotage'
  )

  function changeTab(id: string) {
    setTab(id)
    sessionStorage.setItem(TAB_KEY, id)
  }

  const TABS = [
    { id: 'pilotage', label: 'Synthèse',  icon: LayoutDashboard },
    ...(hasProcessus ? [{ id: 'qualite',  label: 'Qualité',  icon: Package }]    : []),
    ...(hasSecurite  ? [{ id: 'securite', label: 'Sécurité', icon: ShieldCheck }] : []),
  ]

  useEffect(() => {
    if (!TABS.find(t => t.id === tab)) changeTab('pilotage')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasProcessus, hasSecurite])

  const { data: kpis = [], isLoading } = useDashboardKPIs(DIRECTOR_CONFIG)
  const { data: objectives = [] } = useObjectives()
  const activeObjectives = objectives.filter(o => o.status === 'active').slice(0, 6)

  return (
    <div className="max-w-5xl">
      <PageHeader title="Synthèse direction" subtitle="Vue consolidée — lecture seule" />

      {TABS.length > 1 && (
        <DashboardTabs tabs={TABS} active={tab} onChange={changeTab} />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {/* ── Synthèse ── */}
          {tab === 'pilotage' && (
            <div>
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

              <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.08 }}>
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
                            <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-2">
                              <TrendingUp className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                              <span className="text-xs text-slate-500">{obj.kpi_label}</span>
                              {obj.kpi_target && (
                                <span className="text-xs font-semibold text-slate-700 ml-auto">
                                  Cible : {obj.kpi_target}{obj.kpi_unit ? ` ${obj.kpi_unit}` : ''}
                                </span>
                              )}
                            </div>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </motion.div>
            </div>
          )}

          {/* ── Qualité ── */}
          {tab === 'qualite' && hasProcessus && (
            <DirectorQualiteContent />
          )}

          {/* ── Sécurité ── */}
          {tab === 'securite' && hasSecurite && (
            <SecurityApp />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function DirectorQualiteContent() {
  const { data: ncs = [], isLoading } = useNonConformities({ status: ['open', 'in_treatment'] })
  const { data: processes = [] } = useProcesses()

  const openNcs     = ncs.length
  const criticalNcs = ncs.filter(n => n.severity === 'critical').length
  const activeProcs  = processes.filter(p => p.status === 'active')
  const healthScores = activeProcs.map(p => (p as unknown as { health_score?: number | null }).health_score ?? null).filter((s): s is number => s !== null)
  const avgHealth    = healthScores.length
    ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
    : null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500 mb-1">NC ouvertes</p>
          <p className={`text-3xl font-bold ${openNcs > 0 ? 'text-warning' : 'text-slate-900'}`}>{openNcs}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500 mb-1">NC critiques</p>
          <p className={`text-3xl font-bold ${criticalNcs > 0 ? 'text-danger' : 'text-slate-900'}`}>{criticalNcs}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500 mb-1">Santé processus</p>
          <p className="text-3xl font-bold text-slate-900">
            {avgHealth !== null ? avgHealth : '—'}
            {avgHealth !== null && <span className="text-base text-slate-400 ml-1">%</span>}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Non-conformités ouvertes</h2>
          <Link to="/direction/processus" className="text-xs text-brand-600 hover:underline flex items-center gap-0.5">
            Voir tout <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-slate-50 rounded-lg animate-pulse" />)}
          </div>
        ) : ncs.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Aucune NC ouverte — qualité au vert ✓</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {ncs.slice(0, 8).map(nc => (
              <div key={nc.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{nc.title}</p>
                  <p className="text-xs text-slate-400">
                    {format(new Date(nc.detected_at), 'd MMM yyyy', { locale: fr })}
                  </p>
                </div>
                <span className={`badge ${nc.severity === 'critical' ? 'badge-danger' : nc.severity === 'major' ? 'badge-warning' : 'badge-neutral'}`}>
                  {nc.severity === 'critical' ? 'Critique' : nc.severity === 'major' ? 'Majeure' : 'Mineure'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
