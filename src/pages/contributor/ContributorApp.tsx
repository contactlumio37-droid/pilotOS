import { Routes, Route } from 'react-router-dom'
import { LayoutDashboard, ListChecks, FolderOpen, GitBranch, AlertCircle } from 'lucide-react'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import DashboardPage from './DashboardPage'
import ContributorTeamPage from './TeamPage'
import ActionsPage from '@/pages/shared/ActionsPage'
import ProcessesPage from '@/pages/shared/ProcessesPage'
import DocumentsPage from '@/pages/shared/DocumentsPage'
import SignaturesPage from '@/pages/shared/SignaturesPage'
import ProfilePage from '@/pages/shared/ProfilePage'
import MyReportsPage from '@/pages/shared/MyReportsPage'
import TerrainReportPage from '@/pages/shared/TerrainReportPage'
import TerrainMyReportsPage from '@/pages/shared/TerrainMyReportsPage'
import NotificationsPage from '@/pages/shared/NotificationsPage'

const NAV_ITEMS = [
  { to: '/app',         label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/app/actions', label: 'Actions',          icon: ListChecks },
  { to: '/app/processus', label: 'Processus',      icon: GitBranch },
  { to: '/app/documents', label: 'Documents',      icon: FolderOpen },
  { to: '/app/terrain', label: 'Terrain',           icon: AlertCircle },
]

export default function ContributorApp() {
  const breakpoint = useBreakpoint()
  const isDesktop = breakpoint === 'desktop'

  return (
    <div className="min-h-screen bg-slate-50">
      {isDesktop ? (
        <Sidebar items={NAV_ITEMS} profileTo="/app/profil" />
      ) : (
        <BottomNav items={NAV_ITEMS} />
      )}

      <main className={isDesktop ? 'main-with-sidebar p-8' : 'main-with-bottom-nav p-4'}>
        <Routes>
          <Route path="/"                element={<DashboardPage />} />
          <Route path="/actions"         element={<ActionsPage />} />
          <Route path="/processus"       element={<ProcessesPage />} />
          <Route path="/documents"       element={<DocumentsPage />} />
          <Route path="/terrain"         element={<TerrainReportPage />} />
          <Route path="/terrain/remontees" element={<TerrainMyReportsPage />} />
          <Route path="/equipe"          element={<ContributorTeamPage />} />
          <Route path="/signatures"      element={<SignaturesPage />} />
          <Route path="/profil"          element={<ProfilePage />} />
          <Route path="/feedback"        element={<MyReportsPage />} />
          <Route path="/notifications"   element={<NotificationsPage />} />
        </Routes>
      </main>
    </div>
  )
}
