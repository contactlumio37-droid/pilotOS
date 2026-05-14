import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings2, AlertCircle, ArrowRight, ChevronRight, Inbox,
  LayoutDashboard, Package, ShieldCheck, GripVertical,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, rectSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import PageHeader from '@/components/layout/PageHeader'
import DashboardTabs from '@/components/layout/DashboardTabs'
import KPIConfigDrawer from '@/components/modules/KPIConfigDrawer'
import { OriginBadge, StatusBadge } from '@/components/modules/ActionBadges'
import { useDashboardKPIs, useKpiConfig, useSaveKpiConfig } from '@/hooks/useDashboardKPIs'
import type { KpiValue } from '@/hooks/useDashboardKPIs'
import { useActions } from '@/hooks/useActions'
import { useProjects } from '@/hooks/usePilotage'
import { useHasModule } from '@/hooks/useOrganisation'
import { useAuth } from '@/hooks/useAuth'
import { useNonConformities } from '@/hooks/useProcesses'
import { useProcesses } from '@/hooks/useProcesses'
import SecurityApp from '@/pages/shared/SecurityApp'
import { supabase } from '@/lib/supabase'
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

const TAB_KEY = 'pilotos_manager_dashboard_tab'

export default function ManagerDashboard() {
  const [configOpen, setConfigOpen] = useState(false)
  const { organisation } = useAuth()
  const hasTerrainModule = useHasModule('terrain')
  const hasProcessus     = useHasModule('processus')
  const hasSecurite      = useHasModule('securite')

  const [tab, setTab] = useState<string>(() =>
    sessionStorage.getItem(TAB_KEY) ?? 'pilotage'
  )

  function changeTab(id: string) {
    setTab(id)
    sessionStorage.setItem(TAB_KEY, id)
  }

  const TABS = [
    { id: 'pilotage', label: 'Pilotage',  icon: LayoutDashboard },
    ...(hasProcessus ? [{ id: 'qualite',  label: 'Qualité',   icon: Package }]    : []),
    ...(hasSecurite  ? [{ id: 'securite', label: 'Sécurité',  icon: ShieldCheck }] : []),
  ]

  useEffect(() => {
    if (!TABS.find(t => t.id === tab)) changeTab('pilotage')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasProcessus, hasSecurite])

  const { data: kpiConfig } = useKpiConfig()
  const { data: kpis = [], isLoading: kpisLoading } = useDashboardKPIs(kpiConfig ?? undefined)
  const saveConfig = useSaveKpiConfig()
  const { data: actions = [] } = useActions()
  const { data: projects = [] } = useProjects()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = kpis.findIndex(k => k.id === active.id)
      const newIndex = kpis.findIndex(k => k.id === over.id)
      const newOrder = arrayMove(kpis.map(k => k.id), oldIndex, newIndex)
      saveConfig.mutate({ enabled: kpiConfig?.enabled ?? newOrder, order: newOrder })
    }
  }

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
          tab === 'pilotage' ? (
            <button onClick={() => setConfigOpen(true)} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Settings2 className="w-4 h-4" />
              Configurer
            </button>
          ) : undefined
        }
      />

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
          {/* ── Pilotage ── */}
          {tab === 'pilotage' && (
            <div>
              <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
                {kpisLoading ? (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card animate-pulse h-24" />)}
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={kpis.map(k => k.id)} strategy={rectSortingStrategy}>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {kpis.map(kpi => <SortableKpiCard key={kpi.id} kpi={kpi} />)}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </motion.div>

              <div className="grid lg:grid-cols-2 gap-6">
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
            </div>
          )}

          {/* ── Qualité ── */}
          {tab === 'qualite' && hasProcessus && (
            <QualiteDashboardContent />
          )}

          {/* ── Sécurité ── */}
          {tab === 'securite' && hasSecurite && (
            <SecurityApp />
          )}
        </motion.div>
      </AnimatePresence>

      <KPIConfigDrawer open={configOpen} onClose={() => setConfigOpen(false)} />
    </div>
  )
}

function SortableKpiCard({ kpi }: { kpi: KpiValue }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: kpi.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="relative group card">
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
      >
        <GripVertical className="w-4 h-4 text-slate-300" />
      </div>
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
  )
}

function QualiteDashboardContent() {
  const { organisation } = useAuth()
  const { data: ncs = [], isLoading } = useNonConformities({ status: ['open', 'in_treatment'] })
  const { data: processes = [] } = useProcesses()

  const openNcs      = ncs.length
  const criticalNcs  = ncs.filter(n => n.severity === 'critical').length
  const activeProcs  = processes.filter(p => p.status === 'active')
  const healthScores = activeProcs.map(p => (p as unknown as { health_score?: number | null }).health_score ?? null).filter((s): s is number => s !== null)
  const avgHealth    = healthScores.length
    ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
    : null

  const recentNcs = ncs.slice(0, 8)

  if (!organisation) return null

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
          <Link to="/manager/processus" className="text-xs text-brand-600 hover:underline flex items-center gap-0.5">
            Voir tout <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-slate-50 rounded-lg animate-pulse" />)}
          </div>
        ) : recentNcs.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Aucune NC ouverte — qualité au vert ✓</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentNcs.map(nc => (
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
