import { useState, useMemo, useEffect, type FormEvent } from 'react'
import { differenceInDays, parseISO, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Calendar, User, Link2, Tag, Plus, ChevronDown, ChevronUp, Users,
  type LucideIcon,
} from 'lucide-react'
import {
  Landmark, Folder, RefreshCw, ClipboardCheck, AlertTriangle,
  Cog, Compass, Layers, Flag, Zap, Shield, Target, Award,
} from 'lucide-react'
import { StatusBadge } from '@/components/modules/ActionBadges'
import { PRIORITY_DOT } from '@/components/modules/actionBadgeStyles'
import { useCreateAction, type ActionWithRelations } from '@/hooks/useActions'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import type { Category } from '@/hooks/useCategories'

const CARD_LIMIT = 5

// ── Icon registry ─────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  tag: Tag, landmark: Landmark, folder: Folder, 'refresh-cw': RefreshCw,
  'clipboard-check': ClipboardCheck, 'alert-triangle': AlertTriangle,
  cog: Cog, compass: Compass, 'life-buoy': Shield, award: Award,
  layers: Layers, flag: Flag, zap: Zap, users: Users, shield: Shield, target: Target,
}

function ColIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Tag
  return <Icon className={className ?? 'w-3.5 h-3.5'} />
}

function dueDateClass(dateStr: string, status: string): string {
  if (status === 'done' || status === 'cancelled') return 'text-slate-400'
  const days = differenceInDays(parseISO(dateStr), new Date())
  if (days < 0) return 'text-danger font-semibold'
  if (days <= 7) return 'text-amber-500'
  return 'text-slate-400'
}

// ── Kanban card ───────────────────────────────────────────────

function KanbanCard({ action, onClick }: { action: ActionWithRelations; onClick: () => void }) {
  const dateClass = action.due_date ? dueDateClass(action.due_date, action.status) : ''
  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-brand-200 cursor-pointer transition-all"
    >
      <div className="flex items-start gap-2 mb-2">
        <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[action.priority]}`} title={action.priority} />
        <p className="text-sm font-medium text-slate-800 line-clamp-2">{action.title}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <StatusBadge status={action.status} />
        {action.process && (
          <span
            className="flex items-center gap-0.5 text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 font-medium"
            title={action.process.title}
          >
            <Link2 className="w-2.5 h-2.5" />
            <span className="truncate max-w-[90px]">{action.process.title}</span>
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        {action.responsible_profile?.full_name ? (
          <div className="flex items-center gap-1 text-[10px] text-slate-400 min-w-0">
            <User className="w-3 h-3 shrink-0" />
            <span className="truncate">{action.responsible_profile.full_name}</span>
          </div>
        ) : <span />}
        {action.due_date && (
          <div className={`flex items-center gap-1 text-[10px] shrink-0 ${dateClass}`}>
            <Calendar className="w-3 h-3" />
            {format(parseISO(action.due_date), 'd MMM', { locale: fr })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Quick add inline ──────────────────────────────────────────

function QuickAdd({ categoryId }: { categoryId: string | null }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const { mutateAsync: createAction, isPending } = useCreateAction()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    try {
      await createAction({
        title: title.trim(),
        category_id: categoryId ?? undefined,
        origin: 'manual',
        status: 'todo',
        priority: 'medium',
      })
      setTitle('')
      setOpen(false)
    } catch { /* silently ignore — user can use full drawer for complex cases */ }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 w-full px-3 py-2 mt-2 text-xs text-slate-400 hover:text-slate-600 border border-dashed border-slate-200 hover:border-slate-300 rounded-lg transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Ajouter une action
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-1.5">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') { setTitle(''); setOpen(false) } }}
        placeholder="Titre de l'action…"
        className="input text-sm w-full"
      />
      <div className="flex gap-1.5">
        <button
          type="submit"
          disabled={!title.trim() || isPending}
          className="btn-primary text-xs flex-1 py-1.5 disabled:opacity-50"
        >
          {isPending ? '…' : 'Créer'}
        </button>
        <button
          type="button"
          onClick={() => { setTitle(''); setOpen(false) }}
          className="btn-secondary text-xs px-2.5 py-1.5"
        >
          ✕
        </button>
      </div>
    </form>
  )
}

// ── Kanban column ─────────────────────────────────────────────

interface ColumnProps {
  category: Category | null
  actions: ActionWithRelations[]
  allActions: ActionWithRelations[]
  onCardClick: (a: ActionWithRelations) => void
  filterVersion: string
}

function KanbanColumn({ category, actions, allActions, onCardClick, filterVersion }: ColumnProps) {
  const [expanded, setExpanded] = useState(false)

  // Reset "see more" whenever filters change
  useEffect(() => { setExpanded(false) }, [filterVersion])

  const isUncategorised = category === null
  const color = isUncategorised ? '#94a3b8' : category!.color

  // Progress bar ratio: done / all in this column (regardless of showClosed)
  const columnAll = allActions.filter(a =>
    isUncategorised ? !a.category_id : a.category_id === category!.id,
  )
  const doneCount = columnAll.filter(a => a.status === 'done').length
  const pct = columnAll.length > 0 ? Math.round((doneCount / columnAll.length) * 100) : null

  const visibleCards = expanded ? actions : actions.slice(0, CARD_LIMIT)
  const hiddenCount = actions.length - CARD_LIMIT

  return (
    <div className="flex flex-col min-w-[280px] max-w-[280px] flex-shrink-0">
      {/* Header */}
      <div className="rounded-lg mb-3 overflow-hidden" style={{ backgroundColor: color + '18', color }}>
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {isUncategorised
              ? <Tag className="w-3.5 h-3.5 shrink-0" />
              : <ColIcon name={category!.icon} className="w-3.5 h-3.5 shrink-0" />
            }
            <span className="text-xs font-semibold uppercase tracking-wide truncate">
              {isUncategorised ? 'Non catégorisé' : category!.name}
            </span>
          </div>
          <span className="text-xs font-bold shrink-0 ml-1">{actions.length}</span>
        </div>

        {/* Progress bar */}
        {pct !== null && (
          <div className="px-3 pb-2 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: color + '30' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-[11px] shrink-0" style={{ opacity: 0.7 }}>{pct}%</span>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="space-y-2 flex-1">
        {visibleCards.map(a => (
          <KanbanCard key={a.id} action={a} onClick={() => onCardClick(a)} />
        ))}
        {actions.length === 0 && (
          <div className="text-center py-6 text-xs text-slate-300 border-2 border-dashed border-slate-100 rounded-xl">
            Vide
          </div>
        )}
      </div>

      {/* See more / collapse */}
      {actions.length > CARD_LIMIT && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center justify-center gap-1 mt-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          {expanded
            ? <><ChevronUp className="w-3.5 h-3.5" /> Réduire ↑</>
            : <><ChevronDown className="w-3.5 h-3.5" /> Voir {hiddenCount} autre{hiddenCount > 1 ? 's' : ''} ↓</>
          }
        </button>
      )}

      {/* Quick add */}
      <QuickAdd categoryId={category?.id ?? null} />
    </div>
  )
}

// ── Team workload (desktop only) ──────────────────────────────

function TeamWorkload({ actions }: { actions: ActionWithRelations[] }) {
  const [open, setOpen] = useState(false)
  const breakpoint = useBreakpoint()

  const byPerson = useMemo(() => {
    const openActions = actions.filter(a => a.status !== 'done' && a.status !== 'cancelled')
    const map = new Map<string, { name: string; count: number }>()
    for (const a of openActions) {
      if (!a.responsible_profile?.id) continue
      const id = a.responsible_profile.id
      const name = a.responsible_profile.full_name ?? '?'
      const entry = map.get(id)
      if (entry) entry.count++
      else map.set(id, { name, count: 1 })
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [actions])

  if (breakpoint !== 'desktop' || !byPerson.length) return null

  const maxCount = byPerson[0].count

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors py-1"
      >
        <Users className="w-4 h-4" />
        Charge équipe
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="card p-3 mt-1.5 max-w-lg space-y-2.5">
          {byPerson.map(p => {
            const pct = Math.round((p.count / maxCount) * 100)
            const barColor = p.count > 5 ? 'bg-red-500' : p.count >= 3 ? 'bg-amber-500' : 'bg-emerald-500'
            return (
              <div key={p.name} className="flex items-center gap-3">
                <span className="w-28 text-xs text-slate-700 truncate flex-shrink-0">{p.name}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-slate-500 w-20 text-right flex-shrink-0">
                  {p.count} action{p.count > 1 ? 's' : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Board ─────────────────────────────────────────────────────

interface KanbanBoardProps {
  actions: ActionWithRelations[]
  categories: Category[]
  showClosed?: boolean
  onCardClick: (a: ActionWithRelations) => void
  filterVersion?: string
}

export default function KanbanBoard({
  actions,
  categories,
  showClosed = false,
  onCardClick,
  filterVersion = '',
}: KanbanBoardProps) {
  const visible = showClosed
    ? actions
    : actions.filter(a => a.status !== 'done' && a.status !== 'cancelled')

  const uncategorised = visible.filter(a => !a.category_id)

  return (
    <>
      <TeamWorkload actions={actions} />
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-220px)] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/60">
        {categories.map(cat => (
          <KanbanColumn
            key={cat.id}
            category={cat}
            actions={visible.filter(a => a.category_id === cat.id)}
            allActions={actions}
            onCardClick={onCardClick}
            filterVersion={filterVersion}
          />
        ))}
        {uncategorised.length > 0 && (
          <KanbanColumn
            key="uncategorised"
            category={null}
            actions={uncategorised}
            allActions={actions}
            onCardClick={onCardClick}
            filterVersion={filterVersion}
          />
        )}
      </div>
    </>
  )
}
