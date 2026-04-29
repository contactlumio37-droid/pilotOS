import { useState, useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Plus, Activity, AlertTriangle, Lightbulb, CheckCircle2, Clock,
  ClipboardCheck, ChevronDown, ChevronUp, User, Link2, Search,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import PageHeader from '@/components/layout/PageHeader'
import ProcessDrawer from '@/components/modules/ProcessDrawer'
import NcDrawer from '@/components/modules/NcDrawer'
import KaizenDrawer from '@/components/modules/KaizenDrawer'
import ProcessReviewDrawer from '@/components/modules/ProcessReviewDrawer'
import { useProcesses, useNonConformities, useKaizenPlans } from '@/hooks/useProcesses'
import { useCategories } from '@/hooks/useCategories'
import { useIsAtLeast } from '@/hooks/useRole'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { Process, ProcessType, NcSeverity, NcStatus, KaizenStatus, KaizenPlan } from '@/types/database'
import type { Category } from '@/hooks/useCategories'

// ── Labels & styles ──────────────────────────────────────────

const TYPE_LABELS: Record<ProcessType, string> = {
  management:  'Management',
  operational: 'Opérationnel',
  support:     'Support',
}

const TYPE_BADGE: Record<ProcessType, string> = {
  management:  'badge-brand',
  operational: 'badge-success',
  support:     'badge-neutral',
}

const NC_SEVERITY_CLASS: Record<NcSeverity, string> = {
  minor:    'badge-neutral',
  major:    'badge-warning',
  critical: 'badge-danger',
}

const NC_SEVERITY_LABEL: Record<NcSeverity, string> = {
  minor:    'Mineure',
  major:    'Majeure',
  critical: 'Critique',
}

const NC_STATUS_LABEL: Record<NcStatus, string> = {
  open:         'Ouverte',
  in_treatment: 'En traitement',
  closed:       'Clôturée',
}

const NC_STATUS_CLASS: Record<NcStatus, string> = {
  open:         'badge-danger',
  in_treatment: 'badge-warning',
  closed:       'badge-success',
}

const KAIZEN_STATUS_LABEL: Record<KaizenStatus, string> = {
  planned:     'Planifié',
  in_progress: 'En cours',
  completed:   'Terminé',
}

const KAIZEN_STATUS_CLASS: Record<KaizenStatus, string> = {
  planned:     'badge-neutral',
  in_progress: 'badge-brand',
  completed:   'badge-success',
}

// ── Action counts by process (lightweight query) ──────────────

function useActionCountsByProcess() {
  const { organisation } = useAuth()
  return useQuery({
    queryKey: ['action-counts-by-process', organisation?.id],
    enabled: !!organisation,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('actions')
        .select('process_id')
        .eq('organisation_id', organisation!.id)
        .not('process_id', 'is', null)
      if (error) throw error
      const counts: Record<string, number> = {}
      for (const row of data ?? []) {
        if (row.process_id) counts[row.process_id] = (counts[row.process_id] ?? 0) + 1
      }
      return counts
    },
  })
}

// ── Process tile ─────────────────────────────────────────────

function ProcessTile({
  process,
  category,
  canEdit,
  onEdit,
  actionCount,
}: {
  process: Process
  category: Category | null
  canEdit: boolean
  onEdit: (p: Process) => void
  actionCount: number
}) {
  const borderColor = category?.color ?? '#e2e8f0'

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => canEdit && onEdit(process)}
      className={`bg-white border border-slate-100 rounded-xl p-4 flex flex-col min-h-[140px] transition-all duration-200 ${
        canEdit ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md' : ''
      }`}
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      <div className="flex-1">
        {process.process_code && (
          <span className="text-[10px] font-mono text-slate-400 block mb-0.5">{process.process_code}</span>
        )}
        <p className="text-sm font-semibold text-slate-900 line-clamp-1">{process.title}</p>
        {process.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{process.description}</p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-slate-400 flex-wrap">
        <span className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${process.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          {process.status === 'active' ? 'Actif' : 'Brouillon'}
        </span>
        {process.owner_id && (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            Responsable
          </span>
        )}
        {actionCount > 0 && (
          <span className="flex items-center gap-1">
            <Link2 className="w-3 h-3" />
            {actionCount} action{actionCount > 1 ? 's' : ''}
          </span>
        )}
        <span className={`badge ${TYPE_BADGE[process.process_type]} ml-auto`}>
          {TYPE_LABELS[process.process_type]}
        </span>
      </div>
    </motion.div>
  )
}

// ── Process group (collapsible) ───────────────────────────────

function ProcessGroup({
  category,
  processes,
  canEdit,
  onEdit,
  actionCounts,
}: {
  category: Category | null
  processes: Process[]
  canEdit: boolean
  onEdit: (p: Process) => void
  actionCounts: Record<string, number>
}) {
  const [collapsed, setCollapsed] = useState(false)
  const color = category?.color ?? '#94a3b8'
  const name = category?.name ?? 'Non catégorisé'

  return (
    <div className="mb-6">
      <button
        onClick={() => setCollapsed(v => !v)}
        className="flex items-center gap-2.5 w-full text-left mb-3 group"
      >
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-sm font-semibold text-slate-700 flex-1 group-hover:text-slate-900 transition-colors">
          {name}
        </span>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          {processes.length}
        </span>
        {collapsed
          ? <ChevronDown className="w-4 h-4 text-slate-400" />
          : <ChevronUp className="w-4 h-4 text-slate-400" />
        }
      </button>

      {!collapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {processes.map(p => (
            <ProcessTile
              key={p.id}
              process={p}
              category={category}
              canEdit={canEdit}
              onEdit={onEdit}
              actionCount={actionCounts[p.id] ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────

type Tab = 'processes' | 'nc' | 'kaizen' | 'reviews'

export default function ProcessesPage() {
  const [tab, setTab]               = useState<Tab>('processes')
  const [processOpen, setProcessOpen]   = useState(false)
  const [ncOpen, setNcOpen]             = useState(false)
  const [kaizenOpen, setKaizenOpen]     = useState(false)
  const [reviewOpen, setReviewOpen]     = useState(false)
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null)
  const [selectedKaizen, setSelectedKaizen]   = useState<KaizenPlan | null>(null)
  const [categoryFilter, setCategoryFilter]   = useState('')
  const [processSearch, setProcessSearch]     = useState('')

  const canEdit   = useIsAtLeast('manager')
  const canCreate = useIsAtLeast('manager')

  const { data: processes = [], isLoading: procLoading } = useProcesses()
  const { data: ncs = [],       isLoading: ncLoading }   = useNonConformities()
  const { data: kaizens = [],   isLoading: kaizenLoading } = useKaizenPlans()
  const { categories: processCategories } = useCategories('process')
  const { data: actionCounts = {} } = useActionCountsByProcess()

  // Apply category filter then search filter
  const filteredProcesses = categoryFilter
    ? processes.filter(p => p.category_id === categoryFilter)
    : processes

  const searchedProcesses = processSearch.trim()
    ? filteredProcesses.filter(p =>
        p.title.toLowerCase().includes(processSearch.toLowerCase()),
      )
    : filteredProcesses

  // Group by category (categories in sort_order, then uncategorized last)
  const byCategory = useMemo(() => {
    const result: { category: Category | null; processes: Process[] }[] = []
    const byCatId = new Map<string, Process[]>()
    const uncategorized: Process[] = []

    for (const p of searchedProcesses) {
      if (p.category_id) {
        if (!byCatId.has(p.category_id)) byCatId.set(p.category_id, [])
        byCatId.get(p.category_id)!.push(p)
      } else {
        uncategorized.push(p)
      }
    }

    for (const cat of processCategories) {
      const items = byCatId.get(cat.id)
      if (items?.length) result.push({ category: cat, processes: items })
    }

    // Processes with a category_id that has no matching category entry
    for (const [catId, items] of byCatId) {
      if (!processCategories.find(c => c.id === catId)) {
        result.push({ category: null, processes: items })
      }
    }

    if (uncategorized.length) result.push({ category: null, processes: uncategorized })

    return result
  }, [searchedProcesses, processCategories])

  const openNcs = ncs.filter(n => n.status !== 'closed').length

  function openEditProcess(p: Process) {
    if (!canEdit) return
    setSelectedProcess(p)
    setProcessOpen(true)
  }
  function openCreateProcess() { setSelectedProcess(null); setProcessOpen(true) }
  function openEditKaizen(k: KaizenPlan) { setSelectedKaizen(k); setKaizenOpen(true) }
  function openCreateKaizen() { setSelectedKaizen(null); setKaizenOpen(true) }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Processus"
        subtitle="Cartographie, non-conformités, Kaizen et revues"
        actions={
          canCreate ? (
            <div className="flex gap-2">
              {tab === 'nc' && (
                <button onClick={() => setNcOpen(true)} className="btn-secondary flex items-center gap-1.5 text-sm">
                  <Plus className="w-4 h-4" /> Nouvelle NC
                </button>
              )}
              {tab === 'processes' && (
                <button onClick={openCreateProcess} className="btn-primary flex items-center gap-1.5 text-sm">
                  <Plus className="w-4 h-4" /> Nouveau processus
                </button>
              )}
              {tab === 'kaizen' && (
                <button onClick={openCreateKaizen} className="btn-primary flex items-center gap-1.5 text-sm">
                  <Plus className="w-4 h-4" /> Nouveau Kaizen
                </button>
              )}
              {tab === 'reviews' && (
                <button onClick={() => setReviewOpen(true)} className="btn-primary flex items-center gap-1.5 text-sm">
                  <Plus className="w-4 h-4" /> Démarrer une revue
                </button>
              )}
            </div>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit flex-wrap">
        <TabBtn active={tab === 'processes'} onClick={() => setTab('processes')}>
          <Activity className="w-3.5 h-3.5" /> Processus ({processes.length})
        </TabBtn>
        <TabBtn active={tab === 'nc'} onClick={() => setTab('nc')}>
          <AlertTriangle className="w-3.5 h-3.5" />
          NC {openNcs > 0 && <span className="ml-0.5 badge badge-danger text-xs px-1.5 py-0">{openNcs}</span>}
          <span className="text-slate-400">({ncs.length})</span>
        </TabBtn>
        <TabBtn active={tab === 'kaizen'} onClick={() => setTab('kaizen')}>
          <Lightbulb className="w-3.5 h-3.5" /> Kaizen ({kaizens.length})
        </TabBtn>
        <TabBtn active={tab === 'reviews'} onClick={() => setTab('reviews')}>
          <ClipboardCheck className="w-3.5 h-3.5" /> Revues
        </TabBtn>
      </div>

      {/* ── Processes ── */}
      {tab === 'processes' && (
        <>
          {/* Search + category filter */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={processSearch}
                onChange={e => setProcessSearch(e.target.value)}
                placeholder="Rechercher un processus…"
                className="input pl-9 text-sm"
              />
            </div>

            {processCategories.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setCategoryFilter('')}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    !categoryFilter
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  Toutes
                </button>
                {processCategories.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setCategoryFilter(c.id === categoryFilter ? '' : c.id)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      categoryFilter === c.id
                        ? 'border-current text-white'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                    style={categoryFilter === c.id ? { backgroundColor: c.color, borderColor: c.color } : {}}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {procLoading && <LoadingSkeleton />}

          {!procLoading && searchedProcesses.length === 0 && (
            <EmptyState
              icon={<Activity className="w-10 h-10 text-slate-200 mx-auto mb-3" />}
              title={
                categoryFilter || processSearch
                  ? 'Aucun processus ne correspond aux filtres.'
                  : 'Aucun processus documenté'
              }
              cta={
                !categoryFilter && !processSearch && canCreate
                  ? <button onClick={openCreateProcess} className="btn-primary mt-4 text-sm">Créer le premier processus</button>
                  : undefined
              }
            />
          )}

          {!procLoading && byCategory.length > 0 && (
            <div>
              {byCategory.map(({ category, processes: groupItems }, idx) => (
                <ProcessGroup
                  key={category?.id ?? `uncategorized-${idx}`}
                  category={category}
                  processes={groupItems}
                  canEdit={canEdit}
                  onEdit={openEditProcess}
                  actionCounts={actionCounts}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Non-conformités ── */}
      {tab === 'nc' && (
        <>
          {ncLoading && <LoadingSkeleton />}

          {!ncLoading && ncs.length === 0 && (
            <EmptyState
              icon={<CheckCircle2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />}
              title="Aucune non-conformité enregistrée"
              subtitle="Félicitations, tout est conforme !"
              cta={canCreate ? <button onClick={() => setNcOpen(true)} className="btn-primary mt-4 text-sm">Signaler une NC</button> : undefined}
            />
          )}

          {!ncLoading && ncs.length > 0 && (
            <div className="grid gap-3">
              {ncs.map(nc => (
                <motion.div key={nc.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-slate-900">{nc.title}</span>
                      {nc.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{nc.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`badge ${NC_SEVERITY_CLASS[nc.severity]}`}>{NC_SEVERITY_LABEL[nc.severity]}</span>
                      <span className={`badge ${NC_STATUS_CLASS[nc.status]}`}>{NC_STATUS_LABEL[nc.status]}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Détectée le {format(new Date(nc.detected_at), 'd MMM yyyy', { locale: fr })}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Kaizen ── */}
      {tab === 'kaizen' && (
        <>
          {kaizenLoading && <LoadingSkeleton />}

          {!kaizenLoading && kaizens.length === 0 && (
            <EmptyState
              icon={<Lightbulb className="w-10 h-10 text-slate-200 mx-auto mb-3" />}
              title="Aucun plan Kaizen en cours"
              subtitle="Créez votre premier plan d'amélioration continue."
            />
          )}

          {!kaizenLoading && kaizens.length > 0 && (
            <div className="grid gap-3">
              {kaizens.map(k => (
                <motion.div key={k.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => canEdit && openEditKaizen(k)}
                  className={`card ${canEdit ? 'card-hover cursor-pointer' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-slate-900">{k.title}</span>
                      {k.objective && (
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{k.objective}</p>
                      )}
                    </div>
                    <span className={`badge ${KAIZEN_STATUS_CLASS[k.status]} shrink-0`}>
                      {KAIZEN_STATUS_LABEL[k.status]}
                    </span>
                  </div>
                  {(k.start_date || k.end_date || k.estimated_savings_hours) && (
                    <div className="mt-2 pt-2 border-t border-slate-50 flex gap-4 text-xs text-slate-400 flex-wrap">
                      {k.start_date && <span>Début {format(new Date(k.start_date), 'd MMM yyyy', { locale: fr })}</span>}
                      {k.end_date   && <span>Fin {format(new Date(k.end_date), 'd MMM yyyy', { locale: fr })}</span>}
                      {k.estimated_savings_hours && <span>~{k.estimated_savings_hours}h économisées</span>}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Revues de processus ── */}
      {tab === 'reviews' && (
        <EmptyState
          icon={<ClipboardCheck className="w-10 h-10 text-slate-200 mx-auto mb-3" />}
          title="Démarrez votre première revue de processus"
          subtitle="Documentez vos constats, conclusions et planifiez la prochaine revue."
          cta={canCreate ? (
            <button onClick={() => setReviewOpen(true)} className="btn-primary mt-4 text-sm">
              Démarrer une revue
            </button>
          ) : undefined}
        />
      )}

      {/* Drawers */}
      <ProcessDrawer
        open={processOpen}
        onClose={() => setProcessOpen(false)}
        process={selectedProcess}
      />
      <NcDrawer
        open={ncOpen}
        onClose={() => setNcOpen(false)}
        processes={processes.map(p => ({ id: p.id, title: p.title }))}
      />
      <KaizenDrawer
        open={kaizenOpen}
        onClose={() => setKaizenOpen(false)}
        kaizen={selectedKaizen}
      />
      <ProcessReviewDrawer
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        processes={processes.map(p => ({ id: p.id, title: p.title }))}
      />
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card animate-pulse min-h-[140px]" />
      ))}
    </div>
  )
}

function EmptyState({ icon, title, subtitle, cta }: {
  icon: ReactNode; title: string; subtitle?: string; cta?: ReactNode
}) {
  return (
    <div className="card text-center py-12">
      {icon}
      <p className="font-medium text-slate-500">{title}</p>
      {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      {cta}
    </div>
  )
}
