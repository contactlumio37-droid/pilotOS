import { useQuery } from '@tanstack/react-query'
import { FileText, GitBranch, BarChart2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useOrganisation } from '@/hooks/useOrganisation'

export default function ReaderDashboard() {
  const { organisation } = useOrganisation()

  const { data: counts } = useQuery({
    queryKey: ['reader_counts', organisation?.id],
    enabled: !!organisation,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [docs, processes, indicators] = await Promise.all([
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('organisation_id', organisation!.id).eq('status', 'active'),
        supabase.from('processes').select('id', { count: 'exact', head: true }).eq('organisation_id', organisation!.id),
        supabase.from('indicators').select('id', { count: 'exact', head: true }).eq('organisation_id', organisation!.id),
      ])
      return {
        documents: docs.count ?? 0,
        processes: processes.count ?? 0,
        indicators: indicators.count ?? 0,
      }
    },
  })

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Bienvenue</h1>
        <p className="text-slate-500 text-sm mt-1">{organisation?.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link to="/reader/documents" className="card card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-brand-600" />
            </div>
            <span className="text-sm font-semibold text-slate-700">Documents</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{counts?.documents ?? '—'}</p>
          <p className="text-xs text-slate-400 mt-0.5">en vigueur</p>
        </Link>

        <Link to="/reader/processus" className="card card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm font-semibold text-slate-700">Processus</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{counts?.processes ?? '—'}</p>
          <p className="text-xs text-slate-400 mt-0.5">cartographiés</p>
        </Link>

        <Link to="/reader/indicateurs" className="card card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm font-semibold text-slate-700">Indicateurs</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{counts?.indicators ?? '—'}</p>
          <p className="text-xs text-slate-400 mt-0.5">suivis</p>
        </Link>
      </div>

      <div className="card">
        <p className="text-sm text-slate-500 leading-relaxed">
          Vous disposez d'un accès en lecture seule aux documents, processus et indicateurs de votre organisation.
          Pour toute demande de modification, contactez votre responsable.
        </p>
      </div>
    </div>
  )
}
