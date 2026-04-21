import type { ActionOrigin, ActionStatus, ActionPriority } from '@/types/database'

const ORIGIN_STYLES: Record<ActionOrigin, { label: string; className: string }> = {
  manual:         { label: 'Manuel',         className: 'bg-slate-100 text-slate-600' },
  process_review: { label: 'Revue process',  className: 'bg-blue-100 text-blue-700' },
  codir:          { label: 'CODIR',          className: 'bg-purple-100 text-purple-700' },
  audit:          { label: 'Audit',          className: 'bg-orange-100 text-orange-700' },
  incident:       { label: 'Incident',       className: 'bg-red-100 text-red-700' },
  kaizen:         { label: 'Kaizen',         className: 'bg-green-100 text-green-700' },
  terrain:        { label: 'Terrain',        className: 'bg-amber-100 text-amber-700' },
}

const STATUS_STYLES: Record<ActionStatus, { label: string; className: string }> = {
  todo:        { label: 'À faire',    className: 'badge-neutral' },
  in_progress: { label: 'En cours',   className: 'badge-brand' },
  done:        { label: 'Terminé',    className: 'badge-success' },
  cancelled:   { label: 'Annulé',     className: 'badge bg-slate-100 text-slate-400' },
  late:        { label: 'En retard',  className: 'badge-danger' },
}

const PRIORITY_STYLES: Record<ActionPriority, { label: string; className: string }> = {
  low:      { label: 'Basse',    className: 'badge-neutral' },
  medium:   { label: 'Moyenne',  className: 'badge-brand' },
  high:     { label: 'Haute',    className: 'badge-warning' },
  critical: { label: 'Critique', className: 'badge-danger' },
}

export function OriginBadge({ origin }: { origin: ActionOrigin }) {
  const s = ORIGIN_STYLES[origin]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  )
}

export function StatusBadge({ status }: { status: ActionStatus }) {
  const s = STATUS_STYLES[status]
  return <span className={s.className}>{s.label}</span>
}

export function PriorityBadge({ priority }: { priority: ActionPriority }) {
  const s = PRIORITY_STYLES[priority]
  return <span className={s.className}>{s.label}</span>
}

export { ORIGIN_STYLES, STATUS_STYLES, PRIORITY_STYLES }
