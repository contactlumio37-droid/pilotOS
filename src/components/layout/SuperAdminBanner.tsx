import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { clearOrgContext, ORG_CONTEXT_KEY } from '@/hooks/useOrganisation'
import { useOrganisation } from '@/hooks/useOrganisation'

export default function SuperAdminBanner() {
  const { organisation, member } = useOrganisation()

  if (member?.role !== 'superadmin') return null
  if (!sessionStorage.getItem(ORG_CONTEXT_KEY)) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900 text-white px-4 py-2 flex items-center justify-between text-sm shadow-lg">
      <div className="flex items-center gap-2.5">
        <ShieldAlert className="w-4 h-4 text-brand-400 shrink-0" />
        <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">SuperAdmin</span>
        <span className="text-slate-600">—</span>
        <span className="font-medium text-white truncate max-w-[200px]">{organisation?.name}</span>
      </div>
      <button
        onClick={() => { clearOrgContext(); window.location.href = '/superadmin' }}
        className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors shrink-0 ml-4"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Retour backend</span>
      </button>
    </div>
  )
}
