import { Link } from 'react-router-dom'
import { ChevronRight, Inbox } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useNonConformities, useProcesses } from '@/hooks/useProcesses'

interface Props {
  ncLink: string
}

export default function QualiteDashboardContent({ ncLink }: Props) {
  const { data: ncs = [], isLoading } = useNonConformities({ status: ['open', 'in_treatment'] })
  const { data: processes = [] } = useProcesses()

  const openNcs     = ncs.length
  const criticalNcs = ncs.filter(n => n.severity === 'critical').length
  const activeProcs = processes.filter(p => p.status === 'active')
  const healthScores = activeProcs
    .map(p => p.health_score)
    .filter((s): s is number => s !== null)
  const avgHealth = healthScores.length
    ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
    : null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500 mb-1">NC ouvertes</p>
          <p className={`text-3xl font-bold ${openNcs > 0 ? 'text-warning' : 'text-slate-900'}`}>{openNcs}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500 mb-1">NC critiques</p>
          <p className={`text-3xl font-bold ${criticalNcs > 0 ? 'text-danger' : 'text-slate-900'}`}>{criticalNcs}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500 mb-1">Santé processus</p>
          <p className="text-3xl font-bold text-slate-900">
            {avgHealth !== null ? avgHealth : '—'}
            {avgHealth !== null && <span className="text-base text-slate-400 ml-1">%</span>}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Non-conformités ouvertes</h2>
          <Link to={ncLink} className="text-xs text-brand-600 hover:underline flex items-center gap-0.5">
            Voir tout <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-slate-50 rounded-lg animate-pulse" />)}
          </div>
        ) : ncs.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Aucune NC ouverte — qualité au vert ✓</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {ncs.slice(0, 8).map(nc => (
              <div key={nc.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{nc.title}</p>
                  <p className="text-xs text-slate-400">
                    {format(new Date(nc.detected_at), 'd MMM yyyy', { locale: fr })}
                  </p>
                </div>
                <span className={`badge ${nc.severity === 'critical' ? 'badge-danger' : nc.severity === 'major' ? 'badge-warning' : 'badge-neutral'}`}>
                  {nc.severity === 'critical' ? 'Critique' : nc.severity === 'major' ? 'Majeure' : 'Mineure'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
