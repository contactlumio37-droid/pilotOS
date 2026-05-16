import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useOrganisation } from '@/hooks/useOrganisation'
import { isPlanAtLeast, PLANS, type PlanKey } from '@/lib/stripe'

interface Props {
  required: PlanKey
  children: ReactNode
  featureName?: string
}

export default function PlanGate({ required, children, featureName }: Props) {
  const { organisation } = useOrganisation()
  const allowed = isPlanAtLeast(organisation?.plan, required)

  if (allowed) return <>{children}</>

  const planName = PLANS[required].name

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-6">
      <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <Lock className="w-6 h-6 text-brand-600" />
      </div>
      <h2 className="text-lg font-bold text-slate-900 mb-2">
        {featureName ? `${featureName} — ` : ''}Fonctionnalité {planName}
      </h2>
      <p className="text-slate-500 text-sm max-w-xs mb-6">
        Cette fonctionnalité est disponible à partir du plan <strong>{planName}</strong>.
        Passez à un plan supérieur pour y accéder.
      </p>
      <Link to="/admin/abonnement" className="btn-primary">
        Mettre à niveau
      </Link>
    </div>
  )
}
