import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrganisation } from '@/hooks/useOrganisation'
import type { Action } from '@/types/database'

const STATUS_LABELS: Record<Action['status'], string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminé',
  cancelled: 'Annulé',
  late: 'En retard',
}

const PRIORITY_BADGE: Record<Action['priority'], string> = {
  low: 'badge-neutral',
  medium: 'badge-brand',
  high: 'badge-warning',
  critical: 'badge-danger',
}

export default function ActionsPage() {
  const { organisation } = useOrganisation()
  const [search, setSearch] = useState('')

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['actions', organisation?.id],
    queryFn: async () => {
      if (!organisation) return []
      const { data, error } = await supabase
        .from('actions')
        .select('*')
        .eq('organisation_id', organisation.id)
        .order('due_date', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data as Action[]
    },
    enabled: !!organisation,
  })

  const filtered = actions.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="max-w-4xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Actions</h1>
          <button className="btn-primary">
            <Plus className="w-4 h-4" />
            Nouvelle action
          </button>
        </div>

        {/* Recherche */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Rechercher une action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-medium mb-2">Aucune action pour l'instant</p>
            <p className="text-sm">Créez votre première action pour démarrer votre plan d'actions.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((action, i) => (
              <motion.div
                key={action.id}
                initial={{ y: 4, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="card-hover cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{action.title}</p>
                    {action.due_date && (
                      <p className="text-xs text-slate-400 mt-1">
                        Échéance : {new Date(action.due_date).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`badge ${PRIORITY_BADGE[action.priority]}`}>
                      {action.priority === 'critical' ? 'Critique' :
                       action.priority === 'high' ? 'Haute' :
                       action.priority === 'low' ? 'Basse' : 'Normale'}
                    </span>
                    <span className={`badge ${
                      action.status === 'late' ? 'badge-danger' :
                      action.status === 'done' ? 'badge-success' :
                      action.status === 'in_progress' ? 'badge-brand' : 'badge-neutral'
                    }`}>
                      {STATUS_LABELS[action.status]}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
