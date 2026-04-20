import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Building2, Users, Bug, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function SuperAdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['superadmin_stats'],
    queryFn: async () => {
      const [orgs, bugs] = await Promise.all([
        supabase.from('organisations').select('id, plan', { count: 'exact' }),
        supabase.from('feedback_reports').select('id', { count: 'exact', head: true })
          .eq('category', 'bug').eq('status', 'new'),
      ])

      const orgData = orgs.data ?? []
      return {
        total_orgs: orgs.count ?? 0,
        paying: orgData.filter((o) => o.plan !== 'free').length,
        new_bugs: bugs.count ?? 0,
      }
    },
  })

  const cards = [
    { label: 'Organisations totales', value: stats?.total_orgs ?? '—', icon: Building2 },
    { label: 'Clients payants', value: stats?.paying ?? '—', icon: TrendingUp },
    { label: 'Bugs non traités', value: stats?.new_bugs ?? '—', icon: Bug },
    { label: 'Utilisateurs', value: '—', icon: Users },
  ]

  return (
    <div className="max-w-5xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h1 className="text-2xl font-bold text-white mb-8">Dashboard SuperAdmin</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map((card, i) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.label}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                className="bg-slate-800 rounded-xl p-6 border border-slate-700"
              >
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Icon className="w-4 h-4" />
                  {card.label}
                </div>
                <div className="text-3xl font-bold text-white">{card.value}</div>
              </motion.div>
            )
          })}
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <p className="text-slate-400 text-sm text-center py-8">
            Graphiques d'usage et revenus — disponibles en V1
          </p>
        </div>
      </motion.div>
    </div>
  )
}
