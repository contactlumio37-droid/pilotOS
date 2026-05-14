import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ListChecks, GitBranch, FileText, Users, AlertTriangle, TrendingUp, LayoutDashboard, Package, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganisation, useHasModule } from '@/hooks/useOrganisation'
import OrgHealthScore from '@/components/features/OrgHealthScore'
import DashboardTabs from '@/components/layout/DashboardTabs'
import SecurityApp from '@/pages/shared/SecurityApp'
import { useNonConformities } from '@/hooks/useProcesses'
import { useProcesses } from '@/hooks/useProcesses'
import { Link } from 'react-router-dom'
import { ChevronRight, Inbox } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

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

const TAB_KEY = 'pilotos_admin_dashboard_tab'

export default function AdminDashboard() {
  const { organisation } = useOrganisation()
  const orgId = organisation?.id
  const hasProcessus = useHasModule('processus')
  const hasSecurite  = useHasModule('securite')

  const [tab, setTab] = useState<string>(() =>
    sessionStorage.getItem(TAB_KEY) ?? 'pilotage'
  )

  function changeTab(id: string) {
    setTab(id)
    sessionStorage.setItem(TAB_KEY, id)
  }

  const TABS = [
    { id: 'pilotage', label: 'Administration', icon: LayoutDashboard },
    ...(hasProcessus ? [{ id: 'qualite',  label: 'Qualité',  icon: Package }]    : []),
    ...(hasSecurite  ? [{ id: 'securite', label: 'Sécurité', icon: ShieldCheck }] : []),
  ]

  useEffect(() => {
    if (!TABS.find(t => t.id === tab)) changeTab('pilotage')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasProcessus, hasSecurite])

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Administration</h1>
            <p className="text-sm text-slate-500 mt-1">{organisation?.name}</p>
          </div>
          <span className="badge badge-brand capitalize">{organisation?.plan ?? '—'}</span>
        </div>

        {TABS.length > 1 && (
          <DashboardTabs tabs={TABS} active={tab} onChange={changeTab} />
        )}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {/* ── Administration ── */}
          {tab === 'pilotage' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.map(s => <Stat key={s.label} {...s} />)}
              </div>

              <div className="mt-6">
                <OrgHealthScore />
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
            </div>
          )}

          {/* ── Qualité ── */}
          {tab === 'qualite' && hasProcessus && (
            <AdminQualiteContent />
          )}

          {/* ── Sécurité ── */}
          {tab === 'securite' && hasSecurite && (
            <SecurityApp />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function AdminQualiteContent() {
  const { data: ncs = [], isLoading } = useNonConformities({ status: ['open', 'in_treatment'] })
  const { data: processes = [] } = useProcesses()

  const openNcs     = ncs.length
  const criticalNcs = ncs.filter(n => n.severity === 'critical').length
  const activeProcs  = processes.filter(p => p.status === 'active')
  const healthScores = activeProcs.map(p => (p as unknown as { health_score?: number | null }).health_score ?? null).filter((s): s is number => s !== null)
  const avgHealth    = healthScores.length
    ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
    : null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500 mb-1">NC ouvertes</p>
          <p className={`text-3xl font-bold ${openNcs > 0 ? 'text-warning' : 'text-slate-900'}`}>{openNcs}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500 mb-1">NC critiques</p>
          <p className={`text-3xl font-bold ${criticalNcs > 0 ? 'text-danger' : 'text-slate-900'}`}>{criticalNcs}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500 mb-1">Santé processus</p>
          <p className="text-3xl font-bold text-slate-900">
            {avgHealth !== null ? avgHealth : '—'}
            {avgHealth !== null && <span className="text-base text-slate-400 ml-1">%</span>}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Non-conformités ouvertes</h2>
          <Link to="/admin/processus" className="text-xs text-brand-600 hover:underline flex items-center gap-0.5">
            Voir tout <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-slate-50 rounded-lg animate-pulse" />)}
          </div>
        ) : ncs.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Aucune NC ouverte — qualité au vert ✓</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {ncs.slice(0, 8).map(nc => (
              <div key={nc.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{nc.title}</p>
                  <p className="text-xs text-slate-400">
                    {format(new Date(nc.detected_at), 'd MMM yyyy', { locale: fr })}
                  </p>
                </div>
                <span className={`badge ${nc.severity === 'critical' ? 'badge-danger' : nc.severity === 'major' ? 'badge-warning' : 'badge-neutral'}`}>
                  {nc.severity === 'critical' ? 'Critique' : nc.severity === 'major' ? 'Majeure' : 'Mineure'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
