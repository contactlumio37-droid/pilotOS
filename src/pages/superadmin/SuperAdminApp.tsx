import { Routes, Route } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Bug, Map, Zap, Globe, BookOpen, Mail, Users,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useAuth } from '@/hooks/useAuth'
import { setOrgContext } from '@/hooks/useOrganisation'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import SuperAdminDashboard from './SuperAdminDashboard'
import SuperAdminOrgs from './SuperAdminOrgs'
import SuperAdminFeedback from './SuperAdminFeedback'
import SuperAdminUsers from './SuperAdminUsers'

const NAV_ITEMS = [
  { to: '/superadmin',               label: 'Dashboard',      icon: LayoutDashboard, end: true },
  { to: '/superadmin/organisations', label: 'Organisations',  icon: Building2 },
  { to: '/superadmin/utilisateurs',  label: 'Utilisateurs',   icon: Users },
  { to: '/superadmin/feedback',      label: 'Bugs & Feedback', icon: Bug },
  { to: '/superadmin/roadmap',       label: 'Roadmap',        icon: Map },
  { to: '/superadmin/bounties',      label: 'Bounties',       icon: Zap },
  { to: '/superadmin/cms',           label: 'CMS Site',       icon: Globe },
  { to: '/superadmin/blog',          label: 'Blog',           icon: BookOpen },
  { to: '/superadmin/newsletter',    label: 'Newsletter',     icon: Mail },
]

// ── Org switcher ──────────────────────────────────────────────

interface OrgMembership {
  org_id: string
  org_name: string
}

function useMyOrgs() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['superadmin_my_orgs', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('organisation_members')
        .select('organisation_id, organisations(id, name)')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
      return (data ?? []).map(m => {
        const org = Array.isArray(m.organisations) ? m.organisations[0] : m.organisations
        return { org_id: m.organisation_id, org_name: (org as { name: string } | null)?.name ?? '—' }
      }) as OrgMembership[]
    },
    enabled: !!user,
  })
}

function OrgSwitcher({ collapsed }: { collapsed: boolean }) {
  const { data: orgs = [] } = useMyOrgs()
  if (!orgs.length) return null

  function switchTo(orgId: string) {
    setOrgContext(orgId)
    window.location.href = '/admin'
  }

  if (collapsed) {
    return (
      <div className="flex flex-col gap-1">
        {orgs.map(o => (
          <button
            key={o.org_id}
            title={`Vue admin : ${o.org_name}`}
            onClick={() => switchTo(o.org_id)}
            className="flex justify-center p-2 rounded-lg text-slate-500 hover:text-brand-400 hover:bg-slate-800 transition-colors"
          >
            <Building2 className="w-4 h-4" />
          </button>
        ))}
      </div>
    )
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold px-1 mb-1.5">
        Mes organisations
      </p>
      {orgs.map(o => (
        <button
          key={o.org_id}
          onClick={() => switchTo(o.org_id)}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-slate-400 hover:text-brand-300 hover:bg-slate-800 transition-colors text-xs font-medium"
        >
          <Building2 className="w-4 h-4 shrink-0 text-brand-500" />
          <span className="truncate">{o.org_name}</span>
        </button>
      ))}
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────

function StubPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
      <p className="text-slate-400 text-sm mb-8">{description}</p>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
        <p className="text-slate-500">Cette section est en cours de développement.</p>
      </div>
    </div>
  )
}

export default function SuperAdminApp() {
  const breakpoint = useBreakpoint()
  const isDesktop = breakpoint === 'desktop'

  return (
    <div className="min-h-screen bg-slate-900">
      {isDesktop ? (
        <Sidebar
          items={NAV_ITEMS}
          dark
          headerSlot={(collapsed) => <OrgSwitcher collapsed={collapsed} />}
        />
      ) : (
        <BottomNav items={NAV_ITEMS.slice(0, 5)} dark />
      )}

      <main className={`${isDesktop ? 'main-with-sidebar' : 'main-with-bottom-nav'} bg-slate-900 min-h-screen p-8`}>
        <Routes>
          <Route path="/"                element={<SuperAdminDashboard />} />
          <Route path="/organisations"   element={<SuperAdminOrgs />} />
          <Route path="/utilisateurs"    element={<SuperAdminUsers />} />
          <Route path="/feedback"        element={<SuperAdminFeedback />} />
          <Route path="/roadmap"         element={<StubPage title="Roadmap" description="Gestion publique de la roadmap produit." />} />
          <Route path="/bounties"        element={<StubPage title="Bounties" description="Programme de récompenses pour les contributions." />} />
          <Route path="/cms"             element={<StubPage title="CMS Site" description="Édition du contenu de la landing page." />} />
          <Route path="/blog"            element={<StubPage title="Blog" description="Gestion des articles de blog." />} />
          <Route path="/newsletter"      element={<StubPage title="Newsletter" description="Gestion des abonnés et envoi de newsletters." />} />
        </Routes>
      </main>
    </div>
  )
}
