import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ListChecks, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganisation } from '@/hooks/useOrganisation'
import { useAuth } from '@/hooks/useAuth'
import type { Action } from '@/types/database'

export default function DashboardPage() {
  const { organisation } = useOrganisation()
  const { user } = useAuth()

  const { data: myActions = [] } = useQuery({
    queryKey: ['dashboard_actions', user?.id, organisation?.id],
    queryFn: async () => {
      if (!user || !organisation) return []
      const { data } = await supabase
        .from('actions')
        .select('*')
        .eq('organisation_id', organisation.id)
        .eq('responsible_id', user.id)
        .not('status', 'in', '(done,cancelled)')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(5)
      return (data ?? []) as Action[]
    },
    enabled: !!user && !!organisation,
  })

  const stats = {
    todo: myActions.filter((a) => a.status === 'todo').length,
    in_progress: myActions.filter((a) => a.status === 'in_progress').length,
    late: myActions.filter((a) => a.status === 'late').length,
  }

  return (
    <div className="max-w-4xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Bonjour 👋</h1>
        <p className="text-slate-500 mb-8">Voici votre tableau de bord.</p>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <ListChecks className="w-4 h-4" />
              À faire
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.todo}</div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <Clock className="w-4 h-4" />
              En cours
            </div>
            <div className="text-3xl font-bold text-brand-600">{stats.in_progress}</div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <AlertCircle className="w-4 h-4" />
              En retard
            </div>
            <div className={`text-3xl font-bold ${stats.late > 0 ? 'text-danger' : 'text-slate-900'}`}>
              {stats.late}
            </div>
          </div>
        </div>

        {/* Mes actions récentes */}
        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-4">Mes actions prioritaires</h2>
          {myActions.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
              <p className="text-slate-500">Toutes vos actions sont à jour !</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{action.title}</p>
                    {action.due_date && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Échéance : {new Date(action.due_date).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                  <span className={`badge ml-3 ${
                    action.status === 'late' ? 'badge-danger' :
                    action.status === 'in_progress' ? 'badge-brand' : 'badge-neutral'
                  }`}>
                    {action.status === 'late' ? 'En retard' :
                     action.status === 'in_progress' ? 'En cours' : 'À faire'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
