import { X, Sparkles, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function DemoBanner() {
  const { organisation } = useAuth()
  const qc = useQueryClient()

  const { data: hasDemoData = false } = useQuery({
    queryKey: ['demo_data_exists', organisation?.id],
    enabled: !!organisation,
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('actions')
        .select('id', { count: 'exact', head: true })
        .eq('organisation_id', organisation!.id)
        .eq('is_demo', true)
      return (count ?? 0) > 0
    },
  })

  const clearMutation = useMutation({
    // Optimistic hide
    onMutate: () => {
      qc.setQueryData(['demo_data_exists', organisation?.id], false)
    },
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Non authentifié')
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seed-demo-org`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: 'clear', organisation_id: organisation!.id }),
        }
      )
      if (!res.ok) throw new Error('Erreur lors de la suppression des données de démo')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actions'] })
      qc.invalidateQueries({ queryKey: ['processes'] })
      qc.invalidateQueries({ queryKey: ['indicators'] })
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] })
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ['demo_data_exists'] })
    },
  })

  if (!hasDemoData) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
        className="relative mb-6 flex items-center gap-3 bg-gradient-to-r from-brand-600/10 to-purple-600/10 border border-brand-200 rounded-xl px-4 py-3"
      >
        <Sparkles className="w-4 h-4 text-brand-600 shrink-0" />
        <p className="text-sm text-slate-700 flex-1">
          <span className="font-semibold text-brand-700">Données de démonstration actives.</span>{' '}
          Ces données sont fictives et vous permettent d'explorer PilotOS librement.
        </p>
        <button
          onClick={() => clearMutation.mutate()}
          disabled={clearMutation.isPending}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors shrink-0 px-2 py-1 rounded hover:bg-red-50"
          title="Effacer les données de démo"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {clearMutation.isPending ? 'Suppression…' : 'Effacer'}
        </button>
        <button
          onClick={() => qc.setQueryData(['demo_data_exists', organisation?.id], false)}
          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/60 transition-colors shrink-0"
          title="Masquer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
