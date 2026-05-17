import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, TrendingUp, Target, LayoutDashboard, Package, ShieldCheck, Settings2, GripVertical } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import DashboardTabs from '@/components/layout/DashboardTabs'
import KPIConfigDrawer from '@/components/modules/KPIConfigDrawer'
import { useDashboardKPIs, useKpiConfig, useSaveKpiConfig } from '@/hooks/useDashboardKPIs'
import type { KpiValue } from '@/hooks/useDashboardKPIs'
import { useObjectives } from '@/hooks/usePilotage'
import { useHasModule } from '@/hooks/useOrganisation'
import { useAuth } from '@/hooks/useAuth'
import SecurityApp from '@/pages/shared/SecurityApp'
import QualiteDashboardContent from '@/components/modules/QualiteDashboardContent'
import DemoBanner from '@/components/features/DemoBanner'
import OnboardingProgress from '@/components/features/OnboardingProgress'
import MoodWidget from '@/components/features/MoodWidget'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, rectSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const VARIANT_CLASSES = {
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  danger:  'bg-danger-light text-danger',
  brand:   'bg-brand-100 text-brand-700',
  neutral: 'bg-slate-100 text-slate-600',
}

const STATUS_LABELS = {
  draft:     { label: 'Brouillon', className: 'badge-neutral' },
  active:    { label: 'Actif',     className: 'badge-brand' },
  completed: { label: 'Atteint',   className: 'badge-success' },
  cancelled: { label: 'Annulé',    className: 'badge bg-slate-100 text-slate-400' },
}

const TAB_KEY = 'pilotos_director_dashboard_tab'

export default function DirectorDashboard() {
  const { organisation } = useAuth()
  const hasProcessus = useHasModule('processus')
  const hasSecurite  = useHasModule('securite')
  const moodEnabled  = organisation?.team_mood_enabled ?? true
  const [configOpen, setConfigOpen] = useState(false)

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

  const { data: kpiConfig } = useKpiConfig()
  const { data: kpis = [], isLoading } = useDashboardKPIs(kpiConfig ?? undefined)
  const saveConfig = useSaveKpiConfig()
  const { data: objectives = [] } = useObjectives()
  const activeObjectives = objectives.filter(o => o.status === 'active').slice(0, 6)

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

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Synthèse direction"
        subtitle="Vue consolidée"
        actions={
          tab === 'pilotage' ? (
            <button onClick={() => setConfigOpen(true)} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Settings2 className="w-4 h-4" />
              Configurer
            </button>
          ) : undefined
        }
      />

      <DemoBanner />
      {organisation && <OnboardingProgress organisationId={organisation.id} />}

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
          {tab === 'pilotage' && (
            <div>
              <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
                {isLoading ? (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card animate-pulse h-24" />)}
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

              {moodEnabled && organisation && (
                <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.06 }} className="mb-6">
                  <MoodWidget organisationId={organisation.id} teamPageTo="/direction/equipe" />
                </motion.div>
              )}

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

          {tab === 'qualite' && hasProcessus && (
            <QualiteDashboardContent ncLink="/direction/processus" />
          )}

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
    <div ref={setNodeRef} style={style} className="relative group card" title={kpi.tooltip}>
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
