import { Routes, Route } from 'react-router-dom'
import {
  LayoutDashboard, ListChecks, GitBranch, FolderOpen,
  AlertCircle, BarChart2, Target, ShieldCheck, Users,
  Gauge, Bell, Award, MessageSquare,
} from 'lucide-react'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useHasModule } from '@/hooks/useOrganisation'
import Sidebar from '@/components/layout/Sidebar'
import type { NavItem } from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import ManagerDashboard from './ManagerDashboard'
import TerrainReportsManager from '@/pages/shared/TerrainReportsManager'
import ActionsPage from '@/pages/shared/ActionsPage'
import StrategyPage from '@/pages/shared/StrategyPage'
import CodirPage from '@/pages/shared/CodirPage'
import ProcessesPage from '@/pages/shared/ProcessesPage'
import IndicatorsPage from '@/pages/shared/IndicatorsPage'
import DocumentsPage from '@/pages/shared/DocumentsPage'
import MembersPage from '@/pages/shared/MembersPage'
import ProfilePage from '@/pages/shared/ProfilePage'
import SecurityApp from '@/pages/shared/SecurityApp'
import NotificationsPage from '@/pages/shared/NotificationsPage'
import GamificationPage from '@/pages/shared/GamificationPage'

const PILOTAGE_GROUP: NavItem = {
  to: '',
  label: 'Pilotage',
  icon: Gauge,
  children: [
    { to: '/manager',             label: 'Vue d\'ensemble', icon: LayoutDashboard, end: true },
    { to: '/manager/actions',     label: 'Actions',          icon: ListChecks },
    { to: '/manager/strategie',   label: 'Stratégie',        icon: Target },
    { to: '/manager/codir',       label: 'CODIR',            icon: MessageSquare },
    { to: '/manager/indicateurs', label: 'Indicateurs',      icon: BarChart2 },
  ],
}

const QUALITE_GROUP: NavItem = {
  to: '',
  label: 'Qualité',
  icon: GitBranch,
  children: [
    { to: '/manager/processus',   label: 'Processus',        icon: GitBranch },
    { to: '/manager/documents',   label: 'Documents',        icon: FolderOpen },
    { to: '/manager/terrain',     label: 'Terrain',          icon: AlertCircle },
  ],
}

const BOTTOM_ITEMS: NavItem[] = [
  { to: '/manager',             label: 'Vue d\'ensemble', icon: LayoutDashboard, end: true },
  { to: '/manager/actions',     label: 'Actions',          icon: ListChecks },
  { to: '/manager/processus',   label: 'Processus',        icon: GitBranch },
  { to: '/manager/documents',   label: 'Documents',        icon: FolderOpen },
  { to: '/manager/membres',     label: 'Membres',          icon: Users },
]

export default function ManagerApp() {
  const breakpoint  = useBreakpoint()
  const isDesktop   = breakpoint === 'desktop'
  const hasSecurite = useHasModule('securite')

  const sidebarItems: NavItem[] = [
    PILOTAGE_GROUP,
    QUALITE_GROUP,
    ...(hasSecurite ? [{ to: '/manager/securite', label: 'Sécurité', icon: ShieldCheck } as NavItem] : []),
    { to: '/manager/membres',       label: 'Membres',       icon: Users },
    { to: '/manager/progression',   label: 'Progression',   icon: Award },
    { to: '/manager/notifications', label: 'Notifications', icon: Bell },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {isDesktop
        ? <Sidebar items={sidebarItems} profileTo="/manager/profil" />
        : <BottomNav items={BOTTOM_ITEMS.slice(0, 5)} />
      }

      <main className={isDesktop ? 'main-with-sidebar p-8' : 'main-with-bottom-nav p-4'}>
        <Routes>
          <Route path="/"               element={<ManagerDashboard />} />
          <Route path="/actions"        element={<ActionsPage />} />
          <Route path="/strategie"      element={<StrategyPage />} />
          <Route path="/codir"          element={<CodirPage />} />
          <Route path="/processus"      element={<ProcessesPage />} />
          <Route path="/indicateurs"    element={<IndicatorsPage />} />
          <Route path="/terrain"        element={<TerrainReportsManager />} />
          <Route path="/documents"      element={<DocumentsPage />} />
          <Route path="/membres"        element={<MembersPage />} />
          <Route path="/securite/*"     element={<SecurityApp />} />
          <Route path="/progression"    element={<GamificationPage />} />
          <Route path="/notifications"  element={<NotificationsPage />} />
          <Route path="/profil"         element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  )
}
