import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Calendar, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Action } from '@/types/database'

const NEXT_STATUS: Partial<Record<Action['status'], Action['status']>> = {
  todo: 'in_progress',
  in_progress: 'done',
}

const STATUS_LABELS: Record<Action['status'], string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminé',
  cancelled: 'Annulé',
  late: 'En retard',
}

export default function TerrainMyActionsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [updateError, setUpdateError] = useState<string | null>(null)

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['my_actions', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('actions')
        .select('*')
        .eq('responsible_id', user.id)
        .not('status', 'in', '(done,cancelled)')
        .order('due_date', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data as Action[]
    },
    enabled: !!user,
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Action['status'] }) => {
      console.log('→ [TerrainUpdateStatus]', { userId: user?.id, id, status })
      const { data, error } = await supabase
        .from('actions')
        .update({
          status,
          ...(status === 'done' ? { completed_at: new Date().toISOString() } : {}),
        })
        .eq('id', id)
        .select()
        .maybeSingle()
      if (error) {
        console.error('✗ [TerrainUpdateStatus]', error.message)
        throw error
      }
      if (!data) {
        const err = new Error('Action introuvable ou accès refusé par la politique de sécurité')
        console.error('✗ [TerrainUpdateStatus] 0 rows', err.message)
        throw err
      }
      console.log('✓ [TerrainUpdateStatus] enregistré', data)
      return data as Action
    },
    onSuccess: () => {
      setUpdateError(null)
      queryClient.invalidateQueries({ queryKey: ['my_actions'] })
    },
    onError: (err: Error) => setUpdateError(err.message),
  })

  if (isLoading) {
    return (
      <div className="p-4 pt-8 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (actions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Tout est à jour !</h2>
          <p className="text-slate-500">Aucune action en attente.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Mes actions</h1>

      {updateError && (
        <div className="mb-4 bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">
          {updateError}
        </div>
      )}

      <div className="space-y-3">
        {actions.map((action, i) => {
          const nextStatus = NEXT_STATUS[action.status]
          const isLate = action.status === 'late'

          return (
            <motion.div
              key={action.id}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`card ${isLate ? 'border-danger' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className={`badge mb-2 ${isLate ? 'badge-danger' : 'badge-neutral'}`}>
                    {STATUS_LABELS[action.status]}
                  </span>
                  <p className="font-medium text-slate-900">{action.title}</p>
                  {action.due_date && (
                    <p className={`flex items-center gap-1 text-xs mt-1 ${
                      isLate ? 'text-danger' : 'text-slate-400'
                    }`}>
                      <Calendar className="w-3 h-3" />
                      {new Date(action.due_date).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long',
                      })}
                    </p>
                  )}
                </div>

                {nextStatus && (
                  <button
                    onClick={() => updateStatus.mutate({ id: action.id, status: nextStatus })}
                    disabled={updateStatus.isPending}
                    className="btn-secondary text-xs py-1.5 px-3 shrink-0"
                  >
                    {nextStatus === 'done' ? '✓ Terminer' : 'Démarrer'}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
