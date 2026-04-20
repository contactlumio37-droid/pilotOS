import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ListChecks, AlertTriangle, GitBranch, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganisation } from '@/hooks/useOrganisation'

export default function ManagerDashboard() {
  const { organisation } = useOrganisation()

  const { data: stats } = useQuery({
    queryKey: ['manager_stats', organisation?.id],
    queryFn: async () => {
      if (!organisation) return null
      const orgId = organisation.id

      const [actions, late, nc, pending] = await Promise.all([
        supabase.from('actions').select('id', { count: 'exact', head: true })
          .eq('organisation_id', orgId).not('status', 'in', '(done,cancelled)'),
        supabase.from('actions').select('id', { count: 'exact', head: true })
          .eq('organisation_id', orgId).eq('status', 'late'),
        supabase.from('non_conformities').select('id', { count: 'exact', head: true })
          .eq('organisation_id', orgId).eq('status', 'open'),
        supabase.from('terrain_reports').select('id', { count: 'exact', head: true })
          .eq('organisation_id', orgId).eq('status', 'pending'),
      ])

      return {
        actions: actions.count ?? 0,
        late: late.count ?? 0,
        nc: nc.count ?? 0,
        pending: pending.count ?? 0,
      }
    },
    enabled: !!organisation,
  })

  const cards = [
    {
      label: 'Actions en cours',
      value: stats?.actions ?? '—',
      icon: ListChecks,
      color: 'text-brand-600',
    },
    {
      label: 'Actions en retard',
      value: stats?.late ?? '—',
      icon: AlertTriangle,
      color: stats?.late ? 'text-danger' : 'text-slate-500',
    },
    {
      label: 'NC ouvertes',
      value: stats?.nc ?? '—',
      icon: GitBranch,
      color: stats?.nc ? 'text-warning' : 'text-slate-500',
    },
    {
      label: 'Signalements terrain',
      value: stats?.pending ?? '—',
      icon: AlertCircle,
      color: 'text-slate-600',
    },
  ]

  return (
    <div className="max-w-5xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Vue d'ensemble</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map((card, i) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.label}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                className="card"
              >
                <div className={`flex items-center gap-2 text-sm mb-2 ${card.color}`}>
                  <Icon className="w-4 h-4" />
                  {card.label}
                </div>
                <div className="text-3xl font-bold text-slate-900">{card.value}</div>
              </motion.div>
            )
          })}
        </div>

        <div className="card">
          <p className="text-slate-500 text-sm text-center py-8">
            Dashboard manager — graphiques et analyses bientôt disponibles.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
