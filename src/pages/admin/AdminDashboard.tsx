import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Users, TrendingUp, LayoutDashboard, Package, ShieldCheck, GripVertical, Settings2 } from 'lucide-react'
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
import { supabase } from '@/lib/supabase'
import { useOrganisation, useHasModule } from '@/hooks/useOrganisation'
import { useDashboardKPIs, useKpiConfig, useSaveKpiConfig } from '@/hooks/useDashboardKPIs'
import type { KpiValue } from '@/hooks/useDashboardKPIs'
import OrgHealthScore from '@/components/features/OrgHealthScore'
import DashboardTabs from '@/components/layout/DashboardTabs'
import DemoBanner from '@/components/features/DemoBanner'
import OnboardingProgress from '@/components/features/OnboardingProgress'
import KPIConfigDrawer from '@/components/modules/KPIConfigDrawer'
import SecurityApp from '@/pages/shared/SecurityApp'
import QualiteDashboardContent from '@/components/modules/QualiteDashboardContent'
import PendingSignaturesWidget from '@/components/features/PendingSignaturesWidget'

const VARIANT_CLASSES = {
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  danger:  'bg-danger-light text-danger',
  brand:   'bg-brand-100 text-brand-700',
  neutral: 'bg-slate-100 text-slate-600',
}

const TAB_KEY = 'pilotos_admin_dashboard_tab'

export default function AdminDashboard() {
  const { organisation } = useOrganisation()
  const orgId = organisation?.id
  const hasProcessus = useHasModule('processus')
  const hasSecurite  = useHasModule('securite')
  const [configOpen, setConfigOpen] = useState(false)

  const [tab, setTab] = useState<string>(() =>
    sessionStorage.getItem(TAB_KEY) ?? 'pilotage'
  )

  function changeTab(id: string) {
    setTab(id)
    sessionStorage.setItem(TAB_KEY, id)
  }

  const TABS = [
    { id: 'pilotage', label: 'Administration', icon: LayoutDashboard },
    ...(hasProcessus ? [{ id: 'qualite',  label: 'Qualité',  icon: Package }]    : []),
    ...(hasSecurite  ? [{ id: 'securite', label: 'Sécurité', icon: ShieldCheck }] : []),
  ]

  useEffect(() => {
    if (!TABS.find(t => t.id === tab)) changeTab('pilotage')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasProcessus, hasSecurite])

  const { data: kpiConfig } = useKpiConfig()
  const { data: kpis = [], isLoading: kpisLoading } = useDashboardKPIs(kpiConfig ?? undefined)
  const saveConfig = useSaveKpiConfig()

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

  // Admin-specific stats (not in shared KPI system)
  const { data: memberCount = 0 } = useQuery({
    queryKey: ['count_members', orgId],
    enabled: !!orgId,
    staleTime: 300_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('organisation_members')
        .select('*', { count: 'exact', head: true })
        .eq('organisation_id', orgId!)
        .eq('is_active', true)
      return count ?? 0
    },
  })

  const { data: docCount = 0 } = useQuery({
    queryKey: ['count_docs', orgId],
    enabled: !!orgId,
    staleTime: 120_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('organisation_id', orgId!)
        .eq('status', 'active')
      return count ?? 0
    },
  })

  const { data: indicatorCount = 0 } = useQuery({
    queryKey: ['count_indicators', orgId],
    enabled: !!orgId,
    staleTime: 120_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('indicators')
        .select('*', { count: 'exact', head: true })
        .eq('organisation_id', orgId!)
        .eq('is_active', true)
      return count ?? 0
    },
  })

  return (
    <div className="max-w-5xl">
      <DemoBanner />
      {organisation && <OnboardingProgress organisationId={organisation.id} />}
      <PendingSignaturesWidget />
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Administration</h1>
            <p className="text-sm text-slate-500 mt-1">{organisation?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-brand capitalize">{organisation?.plan ?? '—'}</span>
            {tab === 'pilotage' && (
              <button onClick={() => setConfigOpen(true)} className="btn-secondary flex items-center gap-1.5 text-sm">
                <Settings2 className="w-4 h-4" />
                Configurer
              </button>
            )}
          </div>
        </div>

        {TABS.length > 1 && (
          <DashboardTabs tabs={TABS} active={tab} onChange={changeTab} />
        )}
      </motion.div>

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
              {/* KPIs partagés via Edge Function */}
              <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6">
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

              {/* Stats admin-only */}
              <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}
                className="grid grid-cols-3 gap-4 mb-6">
                <div className="card">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center mb-3">
                    <Users className="w-5 h-5 text-sky-600" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{memberCount}</p>
                  <p className="text-sm text-slate-500 mt-0.5">Membres</p>
                  <p className="text-xs text-slate-400 mt-1">{organisation?.seats_included ?? 0} sièges inclus</p>
                </div>
                <div className="card">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{docCount}</p>
                  <p className="text-sm text-slate-500 mt-0.5">Documents en vigueur</p>
                </div>
                <div className="card">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-3">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{indicatorCount}</p>
                  <p className="text-sm text-slate-500 mt-0.5">Indicateurs actifs</p>
                </div>
              </motion.div>

              <div className="mt-6">
                <OrgHealthScore />
              </div>
            </div>
          )}

          {tab === 'qualite' && hasProcessus && (
            <QualiteDashboardContent ncLink="/admin/processus" />
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
