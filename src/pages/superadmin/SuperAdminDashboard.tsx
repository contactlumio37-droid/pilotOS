import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Building2, Users, Bug, TrendingUp, CreditCard, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Organisation } from '@/types/database'
import SuperAdminOrgs from './SuperAdminOrgs'
import SuperAdminFeedback from './SuperAdminFeedback'
import RoadmapTab from './tabs/RoadmapTab'
import BlogTab from './tabs/BlogTab'
import NewsletterTab from './tabs/NewsletterTab'
import CmsTab from './tabs/CmsTab'

const TABS = [
  { id: 'dashboard',     label: 'Dashboard'     },
  { id: 'organisations', label: 'Organisations'  },
  { id: 'bugs',          label: 'Bugs'           },
  { id: 'roadmap',       label: 'Roadmap'        },
  { id: 'cms',           label: 'CMS'            },
  { id: 'blog',          label: 'Blog'           },
  { id: 'newsletter',    label: 'Newsletter'     },
]

const PLAN_COLORS: Record<string, string> = {
  free:       'bg-slate-700 text-slate-300',
  team:       'bg-blue-900 text-blue-300',
  business:   'bg-green-900 text-green-300',
  pro:        'bg-purple-900 text-purple-300',
  enterprise: 'bg-yellow-900 text-yellow-300',
}

function DashboardOverview() {
  const { data: stats } = useQuery({
    queryKey: ['superadmin_stats'],
    queryFn: async () => {
      const [orgs, members, bugs] = await Promise.all([
        supabase.from('organisations').select('id, plan, created_at'),
        supabase.from('organisation_members').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('feedback_reports').select('id', { count: 'exact', head: true })
          .eq('category', 'bug').eq('status', 'new'),
      ])
      const orgData = orgs.data ?? []
      const paying = orgData.filter(o => o.plan !== 'free').length
      const thisMonth = orgData.filter(o => {
        const d = new Date(o.created_at)
        const now = new Date()
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }).length
      return {
        total_orgs: orgData.length, paying, new_this_month: thisMonth,
        total_members: members.count ?? 0, new_bugs: bugs.count ?? 0,
      }
    },
  })

  const { data: recentOrgs = [] } = useQuery({
    queryKey: ['superadmin_recent_orgs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('organisations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      return (data ?? []) as Organisation[]
    },
  })

  const cards = [
    { label: 'Organisations totales',    value: stats?.total_orgs ?? '—',   icon: Building2,   color: 'text-blue-400' },
    { label: 'Clients payants',           value: stats?.paying ?? '—',        icon: CreditCard,  color: 'text-green-400' },
    { label: 'Utilisateurs actifs',       value: stats?.total_members ?? '—', icon: Users,       color: 'text-purple-400' },
    { label: 'Bugs non traités',          value: stats?.new_bugs ?? '—',      icon: Bug,         color: 'text-red-400' },
    { label: 'Nouvelles orgs ce mois',    value: stats?.new_this_month ?? '—', icon: TrendingUp,  color: 'text-brand-400' },
    {
      label: 'Taux conversion free→paid',
      value: stats?.total_orgs ? `${Math.round((stats.paying / stats.total_orgs) * 100)}%` : '—',
      icon: CheckCircle2,
      color: 'text-emerald-400',
    },
  ]

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map((card, i) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.label}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.06 }}
              className="bg-slate-800 rounded-xl p-6 border border-slate-700"
            >
              <div className={`flex items-center gap-2 text-sm mb-2 ${card.color}`}>
                <Icon className="w-4 h-4" />
                <span className="text-slate-400 text-xs">{card.label}</span>
              </div>
              <div className="text-3xl font-bold text-white">{card.value}</div>
            </motion.div>
          )
        })}
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-slate-300">Dernières organisations créées</h2>
        </div>
        {recentOrgs.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">Aucune organisation</p>
        ) : (
          <table className="w-full">
            <tbody className="divide-y divide-slate-700">
              {recentOrgs.map(org => (
                <tr key={org.id} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-3">
                    <p className="font-medium text-white text-sm">{org.name}</p>
                    <p className="text-xs text-slate-500">{org.slug}</p>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[org.plan]}`}>
                      {org.plan.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-xs text-slate-400 text-right">
                    {format(new Date(org.created_at), 'd MMM yyyy', { locale: fr })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default function SuperAdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const activeTab = searchParams.get('tab') ?? 'dashboard'

  function setTab(id: string) {
    setSearchParams(id === 'dashboard' ? {} : { tab: id })
  }

  return (
    <div>
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        {/* Back button */}
        <button
          onClick={() => navigate('/app/dashboard')}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à mon organisation
        </button>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-slate-700 mb-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'text-white border-b-2 border-brand-500 -mb-px'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'dashboard'     && <DashboardOverview />}
        {activeTab === 'organisations' && <SuperAdminOrgs />}
        {activeTab === 'bugs'          && <SuperAdminFeedback />}
        {activeTab === 'roadmap'       && <RoadmapTab />}
        {activeTab === 'cms'           && <CmsTab />}
        {activeTab === 'blog'          && <BlogTab />}
        {activeTab === 'newsletter'    && <NewsletterTab />}
      </motion.div>
    </div>
  )
}
