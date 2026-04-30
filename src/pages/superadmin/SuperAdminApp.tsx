import { Navigate, Routes, Route } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Bug, Map, Zap, Globe, BookOpen, Mail,
} from 'lucide-react'
import SuperAdminHeader, { SUPERADMIN_HEADER_HEIGHT } from '@/components/layout/SuperAdminHeader'
import SuperAdminDashboard from './SuperAdminDashboard'
import SuperAdminOrgs from './SuperAdminOrgs'
import SuperAdminFeedback from './SuperAdminFeedback'
import BlogTab from './tabs/BlogTab'
import ProfilePage from '@/pages/shared/ProfilePage'

const NAV_ITEMS = [
  { to: '/superadmin',               label: 'Dashboard',       icon: LayoutDashboard, end: true },
  { to: '/superadmin/organisations', label: 'Organisations',   icon: Building2 },
  { to: '/superadmin/feedback',      label: 'Bugs & Feedback', icon: Bug },
  { to: '/superadmin/roadmap',       label: 'Roadmap',         icon: Map },
  { to: '/superadmin/bounties',      label: 'Bounties',        icon: Zap },
  { to: '/superadmin/cms',           label: 'CMS Site',        icon: Globe },
  { to: '/superadmin/blog',          label: 'Blog',            icon: BookOpen },
  { to: '/superadmin/newsletter',    label: 'Newsletter',      icon: Mail },
]

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
  return (
    <div className="min-h-screen bg-slate-900">
      <SuperAdminHeader items={NAV_ITEMS} />

      <main
        className="bg-slate-900 min-h-screen p-8"
        style={{ paddingTop: `calc(${SUPERADMIN_HEADER_HEIGHT}px + 2rem)` }}
      >
        <Routes>
          <Route path="/"              element={<SuperAdminDashboard />} />
          <Route path="/organisations" element={<SuperAdminOrgs />} />
          {/* Redirect legacy utilisateurs route into Organisations sub-tab */}
          <Route path="/utilisateurs"  element={<Navigate to="/superadmin/organisations?tab=utilisateurs" replace />} />
          <Route path="/feedback"      element={<SuperAdminFeedback />} />
          <Route path="/roadmap"       element={<StubPage title="Roadmap"    description="Gestion publique de la roadmap produit." />} />
          <Route path="/bounties"      element={<StubPage title="Bounties"   description="Programme de récompenses pour les contributions." />} />
          <Route path="/cms"           element={<StubPage title="CMS Site"   description="Édition du contenu de la landing page." />} />
          <Route path="/blog"          element={<BlogTab />} />
          <Route path="/newsletter"    element={<StubPage title="Newsletter" description="Gestion des abonnés et envoi de newsletters." />} />
          <Route path="/profil"        element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  )
}
