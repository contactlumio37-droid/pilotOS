import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, SlidersHorizontal, Inbox, LayoutList, Columns, Download, Upload } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import PageHeader from '@/components/layout/PageHeader'
import ActionDrawer from '@/components/modules/ActionDrawer'
import KanbanBoard from '@/components/actions/KanbanBoard'
import ImportActionsModal from '@/components/actions/ImportActionsModal'
import { OriginBadge, StatusBadge, PriorityBadge } from '@/components/modules/ActionBadges'
import { PRIORITY_DOT } from '@/components/modules/actionBadgeStyles'
import { useActions } from '@/hooks/useActions'
import { useCategories } from '@/hooks/useCategories'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import type { ActionWithRelations } from '@/hooks/useActions'
import type { ActionStatus, ActionOrigin } from '@/types/database'

const STATUS_OPTIONS: { value: ActionStatus | ''; label: string }[] = [
  { value: '',            label: 'Tous les statuts' },
  { value: 'todo',        label: 'À faire' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'late',        label: 'En retard' },
  { value: 'done',        label: 'Terminé' },
  { value: 'cancelled',   label: 'Annulé' },
]

const ORIGIN_OPTIONS: { value: ActionOrigin | ''; label: string }[] = [
  { value: '',               label: 'Toutes origines' },
  { value: 'manual',         label: 'Manuel' },
  { value: 'terrain',        label: 'Terrain' },
  { value: 'codir',          label: 'CODIR' },
  { value: 'process_review', label: 'Revue process' },
  { value: 'audit',          label: 'Audit' },
  { value: 'incident',       label: 'Incident' },
  { value: 'kaizen',         label: 'Kaizen' },
]

const VIEW_KEY = 'pilotos_actions_view'

function getStoredView(): 'list' | 'kanban' {
  try { return (localStorage.getItem(VIEW_KEY) as 'list' | 'kanban') ?? 'list' } catch { return 'list' }
}

export default function ActionsPage() {
  const [search, setSearch]       = useState('')
  const [status, setStatus]       = useState<ActionStatus | ''>('')
  const [origin, setOrigin]       = useState<ActionOrigin | ''>('')
  const [responsible, setResponsible] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showClosed, setShowClosed]   = useState(false)
  const [drawerOpen, setDrawerOpen]   = useState(false)
  const [selected, setSelected]       = useState<ActionWithRelations | null>(null)
  const [viewMode, setViewMode]       = useState<'list' | 'kanban'>(getStoredView)
  const [showImport, setShowImport]   = useState(false)

  const breakpoint = useBreakpoint()
  const isDesktop = breakpoint === 'desktop'
  const effectiveView = isDesktop ? viewMode : 'list'

  const { data: actions = [], isLoading, isError } = useActions({
    search: search || undefined,
    status: status ? [status] : undefined,
    origin: origin ? [origin] : undefined,
  })

  const { categories } = useCategories('action')

  // Unique responsibles from loaded actions
  const responsibleOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const a of actions) {
      if (a.responsible_profile?.id && a.responsible_profile.full_name) {
        seen.set(a.responsible_profile.id, a.responsible_profile.full_name)
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [actions])

  function openCreate() { setSelected(null); setDrawerOpen(true) }
  function openEdit(a: ActionWithRelations) { setSelected(a); setDrawerOpen(true) }

  function toggleView(mode: 'list' | 'kanban') {
    setViewMode(mode)
    try { localStorage.setItem(VIEW_KEY, mode) } catch { /* noop */ }
  }

  // Client-side filter for responsible (server doesn't support it)
  const filteredActions = responsible
    ? actions.filter(a => a.responsible_profile?.id === responsible)
    : actions

  // For list view, also apply showClosed filter
  const listActions = showClosed
    ? filteredActions
    : filteredActions.filter(a => a.status !== 'done' && a.status !== 'cancelled')

  const activeFilters = [status, origin, responsible].filter(Boolean).length

  // Key that resets kanban column expanded states when any filter changes
  const filterVersion = [search, status, origin, responsible, String(showClosed)].join('|')

  // Keyboard shortcut: N → open create (desktop, outside inputs)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key !== 'n' && e.key !== 'N') return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      setSelected(null)
      setDrawerOpen(true)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function handleExport() {
    const today = format(new Date(), 'yyyy-MM-dd')
    const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]))
    const headers = ['Titre', 'Catégorie', 'Statut', 'Priorité', 'Responsable', 'Approbateur', 'Échéance', 'Processus lié', 'Date création']
    const rows = listActions.map(a => [
      a.title,
      a.category_id ? (catMap[a.category_id] ?? '') : '',
      a.status,
      a.priority,
      a.responsible_profile?.full_name ?? '',
      a.accountable_profile?.full_name ?? '',
      a.due_date ?? '',
      a.process?.title ?? '',
      a.created_at ? format(new Date(a.created_at), 'dd/MM/yyyy', { locale: fr }) : '',
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `actions_${today}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Actions"
        subtitle={`${actions.length} action${actions.length !== 1 ? 's' : ''}`}
        actions={
          <button onClick={openCreate} className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus className="w-4 h-4" />
            Nouvelle action
          </button>
        }
      />

      {/* Toolbar */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une action…"
            className="input pl-9"
          />
        </div>

        {/* Toggle clôturées */}
        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 px-1">
          <button
            type="button"
            onClick={() => setShowClosed(v => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showClosed ? 'bg-brand-600' : 'bg-slate-200'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${showClosed ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
          </button>
          <span className="whitespace-nowrap">Clôturées</span>
        </label>

        <button
          onClick={() => setShowFilters(v => !v)}
          className={`btn-secondary flex items-center gap-1.5 ${activeFilters > 0 ? 'border-brand-400 text-brand-600' : ''}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtres
          {activeFilters > 0 && (
            <span className="bg-brand-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>

        <button
          onClick={() => setShowImport(true)}
          className="btn-secondary flex items-center gap-1.5"
          title="Importer des actions depuis un CSV"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Importer</span>
        </button>

        {listActions.length > 0 && (
          <button
            onClick={handleExport}
            className="btn-secondary flex items-center gap-1.5"
            title="Exporter les actions filtrées (CSV)"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exporter</span>
          </button>
        )}

        {isDesktop && (
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => toggleView('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              title="Vue liste"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleView('kanban')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              title="Vue Kanban"
            >
              <Columns className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Filtres expand */}
      {showFilters && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="grid grid-cols-3 gap-3 mb-4"
        >
          <select value={status} onChange={e => setStatus(e.target.value as ActionStatus | '')} className="input text-sm">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={origin} onChange={e => setOrigin(e.target.value as ActionOrigin | '')} className="input text-sm">
            {ORIGIN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={responsible} onChange={e => setResponsible(e.target.value)} className="input text-sm">
            <option value="">Tous les responsables</option>
            {responsibleOptions.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </motion.div>
      )}

      {/* Errors & loading */}
      {isError && (
        <div className="bg-danger-light text-danger text-sm rounded-xl px-4 py-3 mb-4">
          Impossible de charger les actions. Vérifiez votre connexion et rechargez la page.
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="card animate-pulse h-20" />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && actions.length === 0 && (
        <div className="card text-center py-12">
          <Inbox className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="font-medium text-slate-500">
            {search || activeFilters > 0 ? 'Aucune action ne correspond aux filtres.' : "Aucune action pour l'instant."}
          </p>
          {!search && !activeFilters && (
            <button onClick={openCreate} className="btn-primary mt-4 text-sm">Créer la première action</button>
          )}
        </div>
      )}

      {/* Kanban view */}
      {!isLoading && filteredActions.length > 0 && effectiveView === 'kanban' && (
        <KanbanBoard
          actions={filteredActions}
          categories={categories}
          showClosed={showClosed}
          onCardClick={openEdit}
          filterVersion={filterVersion}
        />
      )}

      {/* List view */}
      {!isLoading && listActions.length > 0 && effectiveView === 'list' && (
        <div className="space-y-2">
          {listActions.map(a => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => openEdit(a)}
              className="card-hover cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[a.priority]}`} title={a.priority} />
                    <p className="text-sm font-medium text-slate-800 truncate">{a.title}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <OriginBadge origin={a.origin} />
                    {a.responsible_profile?.full_name && (
                      <span className="text-xs text-slate-400">
                        → {a.responsible_profile.full_name}
                      </span>
                    )}
                    {a.due_date && (
                      <span className={`text-xs ${a.status === 'late' ? 'text-danger font-medium' : 'text-slate-400'}`}>
                        {a.status === 'late' ? '⚠ ' : ''}
                        {format(new Date(a.due_date), 'd MMM yyyy', { locale: fr })}
                      </span>
                    )}
                    {a.process && (
                      <span className="text-xs text-slate-400">⚙ {a.process.title}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PriorityBadge priority={a.priority} />
                  <StatusBadge status={a.status} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty filtered list */}
      {!isLoading && actions.length > 0 && listActions.length === 0 && effectiveView === 'list' && (
        <div className="card text-center py-10">
          <p className="text-slate-500 font-medium">Aucune action ne correspond aux filtres actifs.</p>
        </div>
      )}

      <ActionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        action={selected}
      />

      {showImport && (
        <ImportActionsModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false) }}
        />
      )}
    </div>
  )
}
