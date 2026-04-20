import { Routes, Route } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Bug, Map, Zap, Globe, BookOpen, Mail,
} from 'lucide-react'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import SuperAdminDashboard from './SuperAdminDashboard'
import SuperAdminOrgs from './SuperAdminOrgs'
import SuperAdminFeedback from './SuperAdminFeedback'

const NAV_ITEMS = [
  { to: '/superadmin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/superadmin/organisations', label: 'Organisations', icon: Building2 },
  { to: '/superadmin/feedback', label: 'Bugs & Feedback', icon: Bug },
  { to: '/superadmin/roadmap', label: 'Roadmap', icon: Map },
  { to: '/superadmin/bounties', label: 'Bounties', icon: Zap },
  { to: '/superadmin/cms', label: 'CMS Site', icon: Globe },
  { to: '/superadmin/blog', label: 'Blog', icon: BookOpen },
  { to: '/superadmin/newsletter', label: 'Newsletter', icon: Mail },
]

export default function SuperAdminApp() {
  const breakpoint = useBreakpoint()
  const isDesktop = breakpoint === 'desktop'

  return (
    <div className="min-h-screen bg-slate-900">
      {isDesktop ? (
        <Sidebar items={NAV_ITEMS} dark />
      ) : (
        <BottomNav items={NAV_ITEMS.slice(0, 5)} dark />
      )}

      <main className={`${isDesktop ? 'main-with-sidebar' : 'main-with-bottom-nav'} bg-slate-900 min-h-screen p-8`}>
        <Routes>
          <Route path="/" element={<SuperAdminDashboard />} />
          <Route path="/organisations" element={<SuperAdminOrgs />} />
          <Route path="/feedback" element={<SuperAdminFeedback />} />
        </Routes>
      </main>
    </div>
  )
}
