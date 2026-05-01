import type { ActionOrigin, ActionStatus, ActionPriority } from '@/types/database'
import { ORIGIN_STYLES, STATUS_STYLES, PRIORITY_STYLES } from './actionBadgeStyles'

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
