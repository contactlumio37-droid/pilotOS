import { type LucideIcon } from 'lucide-react'

interface EmptyStateCTAProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel: string
  onAction: () => void
  secondaryLabel?: string
  onSecondary?: () => void
}

export default function EmptyStateCTA({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: EmptyStateCTAProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
      <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-brand-600" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-xs mb-6 leading-relaxed">{description}</p>
      <div className="flex items-center gap-3">
        <button onClick={onAction} className="btn-primary">
          {actionLabel}
        </button>
        {secondaryLabel && onSecondary && (
          <button onClick={onSecondary} className="btn-secondary text-sm">
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  )
}
