import { Zap, X } from 'lucide-react'
import { useState } from 'react'
import type { FeatureLimit } from '@/hooks/usePlanLimits'

interface PlanLimitBannerProps {
  feature: string
  limit: FeatureLimit
  onUpgrade: () => void
}

export default function PlanLimitBanner({ feature, limit, onUpgrade }: PlanLimitBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || !limit.isOver) return null

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl mb-4 text-sm">
      <Zap className="w-4 h-4 text-amber-500 shrink-0" />
      <span className="text-amber-800 flex-1">
        Limite Free atteinte pour les {feature} ({limit.count}/{limit.max}).{' '}
        <button onClick={onUpgrade} className="font-semibold underline underline-offset-2 hover:text-amber-900">
          Passer au plan Team
        </button>{' '}
        pour continuer.
      </span>
      <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
