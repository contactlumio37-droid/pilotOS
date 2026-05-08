import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  cta?: { label: string; onClick: () => void }
  secondaryCta?: { label: string; onClick: () => void }
  className?: string
}

export default function EmptyState({ icon: Icon, title, description, cta, secondaryCta, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-xs mb-6">{description}</p>}
      {(cta || secondaryCta) && (
        <div className="flex items-center gap-3">
          {cta && (
            <button onClick={cta.onClick} className="btn-primary">
              {cta.label}
            </button>
          )}
          {secondaryCta && (
            <button onClick={secondaryCta.onClick} className="btn-secondary">
              {secondaryCta.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
