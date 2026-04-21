import { motion } from 'framer-motion'
import { CheckCircle2, Clock, AlertCircle, Inbox } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import PageHeader from '@/components/layout/PageHeader'
import { useMyTodayActions, useUpdateAction } from '@/hooks/useActions'
import { useAuth } from '@/hooks/useAuth'
import type { ActionStatus } from '@/types/database'

const STATUS_OPTIONS: { value: ActionStatus; label: string }[] = [
  { value: 'todo',        label: 'À faire' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'done',        label: 'Terminé' },
]

const STATUS_COLOR: Record<ActionStatus, string> = {
  todo: 'text-slate-500', in_progress: 'text-brand-600',
  done: 'text-success', cancelled: 'text-slate-300', late: 'text-danger',
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const { data: actions = [], isLoading } = useMyTodayActions()
  const updateAction = useUpdateAction()

  const todo = actions.filter(a => a.status === 'todo').length
  const inProgress = actions.filter(a => a.status === 'in_progress').length
  const late = actions.filter(a => a.status === 'late').length

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={`${greeting}${firstName ? `, ${firstName}` : ''} 👋`}
        subtitle="Voici vos actions du jour"
      />

      <motion.div initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="grid grid-cols-3 gap-3 mb-8">
        <StatCard label="À faire"   value={todo}       icon={<Clock className="w-4 h-4" />}        color="text-slate-600" />
        <StatCard label="En cours"  value={inProgress} icon={<CheckCircle2 className="w-4 h-4" />} color="text-brand-600" />
        <StatCard label="En retard" value={late}       icon={<AlertCircle className="w-4 h-4" />}  color={late > 0 ? 'text-danger' : 'text-slate-400'} highlight={late > 0} />
      </motion.div>

      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }} className="card">
        <h2 className="font-semibold text-slate-900 mb-4">Mes actions prioritaires</h2>

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        )}

        {!isLoading && actions.length === 0 && (
          <div className="text-center py-10">
            <Inbox className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="font-medium text-slate-500">Toutes vos actions sont à jour !</p>
            <p className="text-sm text-slate-400 mt-1">Profitez-en pour anticiper la suite.</p>
          </div>
        )}

        {!isLoading && actions.length > 0 && (
          <div className="divide-y divide-slate-50">
            {actions.map(action => (
              <div key={action.id} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{action.title}</p>
                  {action.due_date && (
                    <p className={`text-xs mt-0.5 ${action.status === 'late' ? 'text-danger font-medium' : 'text-slate-400'}`}>
                      {action.status === 'late' ? '⚠ En retard — ' : ''}
                      Échéance {format(new Date(action.due_date), 'd MMM', { locale: fr })}
                    </p>
                  )}
                </div>
                <select
                  value={action.status}
                  onChange={e => updateAction.mutate({ id: action.id, status: e.target.value as ActionStatus })}
                  className={`text-xs font-medium border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 ${STATUS_COLOR[action.status]}`}
                >
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

function StatCard({ label, value, icon, color, highlight }: {
  label: string; value: number; icon: React.ReactNode; color: string; highlight?: boolean
}) {
  return (
    <div className={`card ${highlight ? 'border-red-200' : ''}`}>
      <div className={`flex items-center gap-1.5 text-xs mb-1 ${color}`}>{icon}{label}</div>
      <p className={`text-2xl font-bold ${highlight ? 'text-danger' : 'text-slate-900'}`}>{value}</p>
    </div>
  )
}
