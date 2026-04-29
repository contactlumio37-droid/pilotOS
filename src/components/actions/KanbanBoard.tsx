import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Calendar, User } from 'lucide-react'
import { PriorityBadge } from '@/components/modules/ActionBadges'
import type { ActionWithRelations } from '@/hooks/useActions'
import type { ActionCategory } from '@/hooks/useActionCategories'
import type { ActionStatus } from '@/types/database'

const COLUMNS: { status: ActionStatus; label: string; headerClass: string }[] = [
  { status: 'todo',        label: 'À faire',   headerClass: 'bg-slate-100 text-slate-700' },
  { status: 'in_progress', label: 'En cours',  headerClass: 'bg-brand-50 text-brand-700' },
  { status: 'late',        label: 'En retard', headerClass: 'bg-danger-light text-danger' },
  { status: 'done',        label: 'Terminé',   headerClass: 'bg-success-50 text-success-700' },
]

interface KanbanCardProps {
  action: ActionWithRelations
  onClick: () => void
}

function KanbanCard({ action, onClick }: KanbanCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-brand-200 cursor-pointer transition-all"
    >
      <p className="text-sm font-medium text-slate-800 mb-2 line-clamp-2">{action.title}</p>

      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <PriorityBadge priority={action.priority} />
        {action.process && (
          <span className="text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 font-medium truncate max-w-[120px]">
            ⚙ {action.process.title}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        {action.responsible_profile?.full_name ? (
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[90px]">{action.responsible_profile.full_name}</span>
          </div>
        ) : (
          <span />
        )}
        {action.due_date && (
          <div className={`flex items-center gap-1 text-[10px] ${action.status === 'late' ? 'text-danger font-medium' : 'text-slate-400'}`}>
            <Calendar className="w-3 h-3" />
            {format(new Date(action.due_date), 'd MMM', { locale: fr })}
          </div>
        )}
      </div>
    </div>
  )
}

interface KanbanColumnProps {
  label: string
  headerClass: string
  actions: ActionWithRelations[]
  categories: ActionCategory[]
  onCardClick: (a: ActionWithRelations) => void
}

function KanbanColumn({ label, headerClass, actions, categories, onCardClick }: KanbanColumnProps) {
  const categorised = categories.filter(c => actions.some(a => a.category_id === c.id))
  const uncategorised = actions.filter(a => !a.category_id)

  return (
    <div className="flex flex-col min-w-0 flex-1">
      <div className={`flex items-center justify-between px-3 py-2 rounded-lg mb-3 ${headerClass}`}>
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
        <span className="text-xs font-bold">{actions.length}</span>
      </div>

      <div className="space-y-2 flex-1">
        {/* Grouped by category */}
        {categorised.map(cat => {
          const catActions = actions.filter(a => a.category_id === cat.id)
          return (
            <div key={cat.id}>
              <div
                className="flex items-center gap-1.5 mb-1.5 px-1"
                style={{ color: cat.color }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-[10px] font-semibold uppercase tracking-wide truncate">
                  {cat.name}
                </span>
              </div>
              <div className="space-y-2">
                {catActions.map(a => (
                  <KanbanCard key={a.id} action={a} onClick={() => onCardClick(a)} />
                ))}
              </div>
            </div>
          )
        })}

        {/* Uncategorised */}
        {uncategorised.length > 0 && (
          <div>
            {categorised.length > 0 && (
              <div className="flex items-center gap-1.5 mb-1.5 px-1 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Sans catégorie</span>
              </div>
            )}
            <div className="space-y-2">
              {uncategorised.map(a => (
                <KanbanCard key={a.id} action={a} onClick={() => onCardClick(a)} />
              ))}
            </div>
          </div>
        )}

        {actions.length === 0 && (
          <div className="text-center py-6 text-xs text-slate-300 border-2 border-dashed border-slate-100 rounded-xl">
            Vide
          </div>
        )}
      </div>
    </div>
  )
}

interface KanbanBoardProps {
  actions: ActionWithRelations[]
  categories: ActionCategory[]
  showDone?: boolean
  onCardClick: (a: ActionWithRelations) => void
}

export default function KanbanBoard({ actions, categories, showDone = false, onCardClick }: KanbanBoardProps) {
  const visibleColumns = showDone ? COLUMNS : COLUMNS.filter(c => c.status !== 'done')

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {visibleColumns.map(col => (
        <div key={col.status} className="w-64 shrink-0 flex flex-col">
          <KanbanColumn
            {...col}
            actions={actions.filter(a => a.status === col.status)}
            categories={categories}
            onCardClick={onCardClick}
          />
        </div>
      ))}
    </div>
  )
}
