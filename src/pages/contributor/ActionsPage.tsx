import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, SlidersHorizontal, Inbox } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import PageHeader from '@/components/layout/PageHeader'
import ActionDrawer from '@/components/modules/ActionDrawer'
import { OriginBadge, StatusBadge, PriorityBadge } from '@/components/modules/ActionBadges'
import { useActions } from '@/hooks/useActions'
import type { ActionWithRelations } from '@/hooks/useActions'
import type { ActionStatus, ActionPriority, ActionOrigin } from '@/types/database'

const STATUS_OPTIONS: { value: ActionStatus | ''; label: string }[] = [
  { value: '',            label: 'Tous les statuts' },
  { value: 'todo',        label: 'À faire' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'late',        label: 'En retard' },
  { value: 'done',        label: 'Terminé' },
  { value: 'cancelled',   label: 'Annulé' },
]

const PRIORITY_OPTIONS: { value: ActionPriority | ''; label: string }[] = [
  { value: '',         label: 'Toutes priorités' },
  { value: 'critical', label: 'Critique' },
  { value: 'high',     label: 'Haute' },
  { value: 'medium',   label: 'Moyenne' },
  { value: 'low',      label: 'Basse' },
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

export default function ActionsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus]   = useState<ActionStatus | ''>('')
  const [priority, setPriority] = useState<ActionPriority | ''>('')
  const [origin, setOrigin]   = useState<ActionOrigin | ''>('')
  const [showFilters, setShowFilters] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<ActionWithRelations | null>(null)

  const { data: actions = [], isLoading } = useActions({
    search: search || undefined,
    status: status ? [status] : undefined,
    priority: priority ? [priority] : undefined,
    origin: origin ? [origin] : undefined,
  })

  function openCreate() { setSelected(null); setDrawerOpen(true) }
  function openEdit(a: ActionWithRelations) { setSelected(a); setDrawerOpen(true) }

  const activeFilters = [status, priority, origin].filter(Boolean).length

  return (
    <div className="max-w-4xl">
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

      {/* Barre recherche + filtres */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une action…"
            className="input pl-9"
          />
        </div>
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
          <select value={priority} onChange={e => setPriority(e.target.value as ActionPriority | '')} className="input text-sm">
            {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={origin} onChange={e => setOrigin(e.target.value as ActionOrigin | '')} className="input text-sm">
            {ORIGIN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </motion.div>
      )}

      {/* Liste */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="card animate-pulse h-20" />)}
        </div>
      )}

      {!isLoading && actions.length === 0 && (
        <div className="card text-center py-12">
          <Inbox className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="font-medium text-slate-500">
            {search || activeFilters > 0 ? 'Aucune action ne correspond aux filtres.' : 'Aucune action pour l\'instant.'}
          </p>
          {!search && !activeFilters && (
            <button onClick={openCreate} className="btn-primary mt-4 text-sm">Créer la première action</button>
          )}
        </div>
      )}

      {!isLoading && actions.length > 0 && (
        <div className="space-y-2">
          {actions.map(a => (
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

      <ActionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        action={selected}
      />
    </div>
  )
}
