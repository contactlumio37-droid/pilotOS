import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { TerrainReport } from '@/types/database'

const STATUS_CONFIG = {
  pending: { label: 'En attente', icon: Clock, className: 'badge-warning' },
  acknowledged: { label: 'Pris en compte', icon: AlertCircle, className: 'badge-brand' },
  converted: { label: 'Action créée', icon: CheckCircle2, className: 'badge-success' },
  closed: { label: 'Clôturé', icon: XCircle, className: 'badge-neutral' },
} as const

export default function TerrainMyReportsPage() {
  const { user } = useAuth()

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['my_terrain_reports', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('terrain_reports')
        .select('*')
        .eq('reported_by', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as TerrainReport[]
    },
    enabled: !!user,
  })

  if (isLoading) {
    return (
      <div className="p-4 pt-8 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <div className="text-5xl mb-4">👍</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Aucun signalement</h2>
          <p className="text-slate-500">Vos signalements apparaîtront ici.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Mes remontées</h1>

      <div className="space-y-3">
        {reports.map((report, i) => {
          const config = STATUS_CONFIG[report.status]
          const Icon = config.icon
          return (
            <motion.div
              key={report.id}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="card-hover cursor-default"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{report.title}</p>
                  {report.location && (
                    <p className="text-sm text-slate-500 mt-0.5">{report.location}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(report.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long',
                    })}
                  </p>
                </div>
                <span className={config.className}>
                  <Icon className="w-3 h-3" />
                  {config.label}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
