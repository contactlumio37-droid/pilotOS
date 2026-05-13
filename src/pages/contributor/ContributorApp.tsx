import { Routes, Route } from 'react-router-dom'
import {
  LayoutDashboard, ListChecks, FolderOpen, GitBranch,
  AlertCircle, Gauge, BarChart2, ShieldCheck, Bell, Award,
} from 'lucide-react'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import Sidebar from '@/components/layout/Sidebar'
import type { NavItem } from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import { useHasModule } from '@/hooks/useOrganisation'
import DashboardPage from './DashboardPage'
import ActionsPage from '@/pages/shared/ActionsPage'
import ProcessesPage from '@/pages/shared/ProcessesPage'
import DocumentsPage from '@/pages/shared/DocumentsPage'
import ProfilePage from '@/pages/shared/ProfilePage'
import MyReportsPage from '@/pages/shared/MyReportsPage'
import TerrainReportPage from '@/pages/shared/TerrainReportPage'
import TerrainMyReportsPage from '@/pages/shared/TerrainMyReportsPage'
import IndicatorsPage from '@/pages/shared/IndicatorsPage'
import SecurityApp from '@/pages/shared/SecurityApp'
import GamificationPage from '@/pages/shared/GamificationPage'
import NotificationsPage from '@/pages/shared/NotificationsPage'

const PILOTAGE_GROUP: NavItem = {
  to: '',
  label: 'Mon travail',
  icon: Gauge,
  children: [
    { to: '/app',             label: 'Tableau de bord', icon: LayoutDashboard, end: true },
    { to: '/app/actions',     label: 'Actions',          icon: ListChecks },
    { to: '/app/indicateurs', label: 'Indicateurs',      icon: BarChart2 },
  ],
}

const QUALITE_GROUP: NavItem = {
  to: '',
  label: 'Qualité',
  icon: GitBranch,
  children: [
    { to: '/app/processus', label: 'Processus', icon: GitBranch },
    { to: '/app/documents', label: 'Documents',  icon: FolderOpen },
    { to: '/app/terrain',   label: 'Terrain',    icon: AlertCircle },
  ],
}

const BOTTOM_ITEMS: NavItem[] = [
  { to: '/app',           label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/app/actions',   label: 'Actions',          icon: ListChecks },
  { to: '/app/processus', label: 'Processus',        icon: GitBranch },
  { to: '/app/documents', label: 'Documents',        icon: FolderOpen },
  { to: '/app/terrain',   label: 'Terrain',          icon: AlertCircle },
]

export default function ContributorApp() {
  const breakpoint = useBreakpoint()
  const isDesktop = breakpoint === 'desktop'
  const hasSecurite = useHasModule('securite')

  const sidebarItems: NavItem[] = [
    PILOTAGE_GROUP,
    QUALITE_GROUP,
    ...(hasSecurite ? [{ to: '/app/securite', label: 'Sécurité', icon: ShieldCheck } as NavItem] : []),
    { to: '/app/progression',   label: 'Progression',   icon: Award },
    { to: '/app/notifications', label: 'Notifications', icon: Bell },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {isDesktop ? (
        <Sidebar items={sidebarItems} profileTo="/app/profil" />
      ) : (
        <BottomNav items={BOTTOM_ITEMS} />
      )}

      <main className={isDesktop ? 'main-with-sidebar p-8' : 'main-with-bottom-nav p-4'}>
        <Routes>
          <Route path="/"                    element={<DashboardPage />} />
          <Route path="/actions"             element={<ActionsPage />} />
          <Route path="/indicateurs"         element={<IndicatorsPage />} />
          <Route path="/processus"           element={<ProcessesPage />} />
          <Route path="/documents"           element={<DocumentsPage />} />
          <Route path="/terrain"             element={<TerrainReportPage />} />
          <Route path="/terrain/remontees"   element={<TerrainMyReportsPage />} />
          <Route path="/profil"              element={<ProfilePage />} />
          <Route path="/feedback"            element={<MyReportsPage />} />
          <Route path="/securite/*"          element={<SecurityApp />} />
          <Route path="/progression"         element={<GamificationPage />} />
          <Route path="/notifications"       element={<NotificationsPage />} />
        </Routes>
      </main>
    </div>
  )
}
