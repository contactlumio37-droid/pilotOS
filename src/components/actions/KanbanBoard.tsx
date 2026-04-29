import { differenceInDays, parseISO } from 'date-fns'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Calendar, User, Link2, Tag, type LucideIcon } from 'lucide-react'
import {
  Landmark, Folder, RefreshCw, ClipboardCheck, AlertTriangle,
  Cog, Compass, Layers, Flag, Zap, Users, Shield, Target, Award,
} from 'lucide-react'
import { StatusBadge } from '@/components/modules/ActionBadges'
import type { ActionWithRelations } from '@/hooks/useActions'
import type { Category } from '@/hooks/useCategories'

// ── Icon registry ─────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  tag: Tag,
  landmark: Landmark,
  folder: Folder,
  'refresh-cw': RefreshCw,
  'clipboard-check': ClipboardCheck,
  'alert-triangle': AlertTriangle,
  cog: Cog,
  compass: Compass,
  'life-buoy': Shield,
  award: Award,
  layers: Layers,
  flag: Flag,
  zap: Zap,
  users: Users,
  shield: Shield,
  target: Target,
}

function ColIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Tag
  return <Icon className={className ?? 'w-3.5 h-3.5'} />
}

// ── Due date color ────────────────────────────────────────────

function dueDateClass(dateStr: string, status: string): string {
  if (status === 'done' || status === 'cancelled') return 'text-slate-400'
  const days = differenceInDays(parseISO(dateStr), new Date())
  if (days < 0) return 'text-danger font-semibold'
  if (days <= 7) return 'text-amber-500'
  return 'text-slate-400'
}

// ── Kanban card ───────────────────────────────────────────────

interface CardProps {
  action: ActionWithRelations
  onClick: () => void
}

function KanbanCard({ action, onClick }: CardProps) {
  const dateClass = action.due_date ? dueDateClass(action.due_date, action.status) : ''

  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-brand-200 cursor-pointer transition-all"
    >
      <p className="text-sm font-medium text-slate-800 mb-2 line-clamp-2">{action.title}</p>

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
        ) : (
          <span />
        )}
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

// ── Kanban column ─────────────────────────────────────────────

interface ColumnProps {
  category: Category | null
  actions: ActionWithRelations[]
  onCardClick: (a: ActionWithRelations) => void
}

function KanbanColumn({ category, actions, onCardClick }: ColumnProps) {
  const isUncategorised = category === null

  return (
    <div className="flex flex-col min-w-0 w-64 shrink-0">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded-lg mb-3"
        style={
          isUncategorised
            ? { backgroundColor: '#f1f5f9', color: '#64748b' }
            : { backgroundColor: category!.color + '18', color: category!.color }
        }
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {isUncategorised ? (
            <Tag className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <ColIcon name={category!.icon} className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="text-xs font-semibold uppercase tracking-wide truncate">
            {isUncategorised ? 'Non catégorisé' : category!.name}
          </span>
        </div>
        <span className="text-xs font-bold shrink-0 ml-1">{actions.length}</span>
      </div>

      {/* Cards */}
      <div className="space-y-2 flex-1">
        {actions.map(a => (
          <KanbanCard key={a.id} action={a} onClick={() => onCardClick(a)} />
        ))}
        {actions.length === 0 && (
          <div className="text-center py-6 text-xs text-slate-300 border-2 border-dashed border-slate-100 rounded-xl">
            Vide
          </div>
        )}
      </div>
    </div>
  )
}

// ── Board ─────────────────────────────────────────────────────

interface KanbanBoardProps {
  actions: ActionWithRelations[]
  categories: Category[]
  showClosed?: boolean
  onCardClick: (a: ActionWithRelations) => void
}

export default function KanbanBoard({ actions, categories, showClosed = false, onCardClick }: KanbanBoardProps) {
  const visible = showClosed
    ? actions
    : actions.filter(a => a.status !== 'done' && a.status !== 'cancelled')

  const uncategorised = visible.filter(a => !a.category_id)

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {categories.map(cat => (
        <KanbanColumn
          key={cat.id}
          category={cat}
          actions={visible.filter(a => a.category_id === cat.id)}
          onCardClick={onCardClick}
        />
      ))}
      {uncategorised.length > 0 && (
        <KanbanColumn
          key="uncategorised"
          category={null}
          actions={uncategorised}
          onCardClick={onCardClick}
        />
      )}
    </div>
  )
}
