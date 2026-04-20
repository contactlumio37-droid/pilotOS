import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { GitBranch, Activity } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganisation } from '@/hooks/useOrganisation'
import type { Process } from '@/types/database'

const TYPE_LABELS: Record<Process['process_type'], string> = {
  management: 'Management',
  operational: 'Opérationnel',
  support: 'Support',
}

const TYPE_COLORS: Record<Process['process_type'], string> = {
  management: 'badge-brand',
  operational: 'badge-success',
  support: 'badge-neutral',
}

export default function ProcessesPage() {
  const { organisation } = useOrganisation()

  const { data: processes = [], isLoading } = useQuery({
    queryKey: ['processes', organisation?.id],
    queryFn: async () => {
      if (!organisation) return []
      const { data, error } = await supabase
        .from('processes')
        .select('*')
        .eq('organisation_id', organisation.id)
        .eq('status', 'active')
        .order('process_type')
        .order('title')
      if (error) throw error
      return data as Process[]
    },
    enabled: !!organisation,
  })

  const grouped = processes.reduce<Record<string, Process[]>>((acc, p) => {
    const key = p.process_type
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  return (
    <div className="max-w-4xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Processus</h1>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : processes.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <GitBranch className="w-10 h-10 mx-auto mb-3" />
            <p className="text-lg font-medium mb-2">Aucun processus documenté</p>
            <p className="text-sm">Commencez par créer votre premier processus.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {(['management', 'operational', 'support'] as const).map((type) => {
              const items = grouped[type] ?? []
              if (items.length === 0) return null
              return (
                <div key={type}>
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    {TYPE_LABELS[type]}
                  </h2>
                  <div className="space-y-2">
                    {items.map((process, i) => (
                      <motion.div
                        key={process.id}
                        initial={{ x: -4, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="card-hover cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {process.process_code && (
                                <span className="text-xs font-mono text-slate-400">
                                  {process.process_code}
                                </span>
                              )}
                              <p className="font-medium text-slate-900 truncate">
                                {process.title}
                              </p>
                            </div>
                            {process.version && (
                              <p className="text-xs text-slate-400 mt-0.5">{process.version}</p>
                            )}
                          </div>
                          {process.health_score !== null && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Activity className={`w-4 h-4 ${
                                process.health_score >= 80 ? 'text-success' :
                                process.health_score >= 50 ? 'text-warning' : 'text-danger'
                              }`} />
                              <span className="text-sm font-medium text-slate-600">
                                {process.health_score}%
                              </span>
                            </div>
                          )}
                          <span className={`badge ${TYPE_COLORS[process.process_type]}`}>
                            {TYPE_LABELS[process.process_type]}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}
