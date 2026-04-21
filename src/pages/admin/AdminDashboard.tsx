import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ListChecks, GitBranch, FileText, Users, AlertTriangle, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganisation } from '@/hooks/useOrganisation'

interface StatCard {
  label: string
  value: number | string
  icon: React.ElementType
  color: string
  sub?: string
}

function Stat({ label, value, icon: Icon, color, sub }: StatCard) {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const { organisation } = useOrganisation()
  const orgId = organisation?.id

  const { data: actionsCount = 0 } = useQuery({
    queryKey: ['count_actions', orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('actions')
        .select('*', { count: 'exact', head: true })
        .eq('organisation_id', orgId!)
        .in('status', ['todo', 'in_progress'])
      return count ?? 0
    },
  })

  const { data: lateActions = 0 } = useQuery({
    queryKey: ['count_late_actions', orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('actions')
        .select('*', { count: 'exact', head: true })
        .eq('organisation_id', orgId!)
        .eq('status', 'late')
      return count ?? 0
    },
  })

  const { data: processCount = 0 } = useQuery({
    queryKey: ['count_processes', orgId],
    enabled: !!orgId,
    staleTime: 120_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('processes')
        .select('*', { count: 'exact', head: true })
        .eq('organisation_id', orgId!)
        .eq('status', 'active')
      return count ?? 0
    },
  })

  const { data: docCount = 0 } = useQuery({
    queryKey: ['count_docs', orgId],
    enabled: !!orgId,
    staleTime: 120_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('organisation_id', orgId!)
        .eq('status', 'active')
      return count ?? 0
    },
  })

  const { data: memberCount = 0 } = useQuery({
    queryKey: ['count_members', orgId],
    enabled: !!orgId,
    staleTime: 300_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('organisation_members')
        .select('*', { count: 'exact', head: true })
        .eq('organisation_id', orgId!)
        .eq('is_active', true)
      return count ?? 0
    },
  })

  const { data: ncCount = 0 } = useQuery({
    queryKey: ['count_ncs', orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('non_conformities')
        .select('*', { count: 'exact', head: true })
        .eq('organisation_id', orgId!)
        .in('status', ['open', 'in_treatment'])
      return count ?? 0
    },
  })

  const { data: indicatorCount = 0 } = useQuery({
    queryKey: ['count_indicators', orgId],
    enabled: !!orgId,
    staleTime: 120_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('indicators')
        .select('*', { count: 'exact', head: true })
        .eq('organisation_id', orgId!)
        .eq('is_active', true)
      return count ?? 0
    },
  })

  const stats: StatCard[] = [
    {
      label: 'Actions en cours',
      value: actionsCount,
      icon: ListChecks,
      color: 'bg-brand-50 text-brand-600',
      sub: lateActions > 0 ? `${lateActions} en retard` : 'Aucun retard',
    },
    {
      label: 'Processus actifs',
      value: processCount,
      icon: GitBranch,
      color: 'bg-violet-50 text-violet-600',
    },
    {
      label: 'Documents en vigueur',
      value: docCount,
      icon: FileText,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Membres',
      value: memberCount,
      icon: Users,
      color: 'bg-sky-50 text-sky-600',
      sub: `${organisation?.seats_included ?? 0} sièges inclus`,
    },
    {
      label: 'Non-conformités ouvertes',
      value: ncCount,
      icon: AlertTriangle,
      color: ncCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400',
    },
    {
      label: 'Indicateurs actifs',
      value: indicatorCount,
      icon: TrendingUp,
      color: 'bg-indigo-50 text-indigo-600',
    },
  ]

  return (
    <div className="max-w-5xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Administration</h1>
            <p className="text-sm text-slate-500 mt-1">{organisation?.name}</p>
          </div>
          <span className="badge badge-brand capitalize">{organisation?.plan ?? '—'}</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map(s => <Stat key={s.label} {...s} />)}
        </div>

        {lateActions > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">
                {lateActions} action{lateActions > 1 ? 's' : ''} en retard
              </p>
              <p className="text-sm text-amber-700 mt-0.5">
                Des actions ont dépassé leur date d'échéance. Consultez le module Actions pour relancer les responsables.
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
