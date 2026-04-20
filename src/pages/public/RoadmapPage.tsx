import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ThumbsUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { RoadmapItem } from '@/types/database'

const STATUS_CONFIG = {
  shipped: { label: '✅ Livré', className: 'bg-success-light text-success' },
  in_progress: { label: '🔄 En développement', className: 'bg-brand-100 text-brand-700' },
  planned: { label: '📅 Planifié', className: 'bg-slate-100 text-slate-600' },
  considering: { label: '🤔 En réflexion', className: 'bg-warning-light text-warning' },
  declined: { label: '❌ Décliné', className: 'bg-slate-100 text-slate-400' },
} as const

export default function RoadmapPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: items = [] } = useQuery({
    queryKey: ['roadmap_public'],
    queryFn: async () => {
      const { data } = await supabase
        .from('roadmap_items')
        .select('*')
        .eq('is_public', true)
        .order('sort_order')
      return (data ?? []) as RoadmapItem[]
    },
  })

  const vote = useMutation({
    mutationFn: async (itemId: string) => {
      if (!user) throw new Error('Connexion requise')
      const { error } = await supabase
        .from('roadmap_votes')
        .insert({ item_id: itemId, user_id: user.id })
      if (error) throw error
      await supabase.rpc('increment_roadmap_votes', { item_id: itemId })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roadmap_public'] }),
  })

  const grouped = (['shipped', 'in_progress', 'planned', 'considering'] as const).reduce(
    (acc, status) => {
      acc[status] = items.filter((i) => i.status === status)
      return acc
    },
    {} as Record<string, RoadmapItem[]>,
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="font-display font-bold text-xl text-slate-900">PilotOS</Link>
          <Link to="/register" className="btn-primary text-sm py-2">Essai gratuit</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Roadmap publique</h1>
        <p className="text-slate-500 mb-12">
          Votez pour les fonctionnalités qui comptent le plus pour vous.
          {!user && (
            <span> <Link to="/login" className="text-brand-600 hover:underline">Connectez-vous</Link> pour voter.</span>
          )}
        </p>

        <div className="space-y-10">
          {(['in_progress', 'planned', 'considering', 'shipped'] as const).map((status) => {
            const statusItems = grouped[status] ?? []
            if (statusItems.length === 0) return null
            const config = STATUS_CONFIG[status]

            return (
              <section key={status}>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${config.className}`}>
                    {config.label}
                  </span>
                  <span>{statusItems.length} items</span>
                </h2>

                <div className="space-y-2">
                  {statusItems.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ y: 4, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="card-hover"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900">{item.title}</p>
                          {item.description && (
                            <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                          )}
                          {item.version_target && (
                            <p className="text-xs text-slate-400 mt-1">Cible : {item.version_target}</p>
                          )}
                        </div>
                        <button
                          onClick={() => user ? vote.mutate(item.id) : undefined}
                          disabled={!user || vote.isPending}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors shrink-0 ${
                            user
                              ? 'border-slate-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 text-slate-600'
                              : 'border-slate-100 text-slate-300 cursor-default'
                          }`}
                        >
                          <ThumbsUp className="w-4 h-4" />
                          {item.votes}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )
          })}

          {items.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg font-medium mb-2">Roadmap en construction</p>
              <p className="text-sm">Revenez bientôt !</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
