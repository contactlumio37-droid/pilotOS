import { Routes, Route } from 'react-router-dom'
import {
  LayoutDashboard, Target, ListChecks, GitBranch, FolderOpen,
  BarChart2, AlertCircle, Users, ShieldCheck, Bell, Award, MessageSquare,
  Gauge,
} from 'lucide-react'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useHasModule } from '@/hooks/useOrganisation'
import Sidebar from '@/components/layout/Sidebar'
import type { NavItem } from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import DirectorDashboard from './DirectorDashboard'
import StrategyPage from '@/pages/shared/StrategyPage'
import CodirPage from '@/pages/shared/CodirPage'
import ActionsPage from '@/pages/shared/ActionsPage'
import ProcessesPage from '@/pages/shared/ProcessesPage'
import IndicatorsPage from '@/pages/shared/IndicatorsPage'
import DocumentsPage from '@/pages/shared/DocumentsPage'
import MembersPage from '@/pages/shared/MembersPage'
import TerrainReportsManager from '@/pages/shared/TerrainReportsManager'
import ProfilePage from '@/pages/shared/ProfilePage'
import SecurityApp from '@/pages/shared/SecurityApp'
import NotificationsPage from '@/pages/shared/NotificationsPage'
import GamificationPage from '@/pages/shared/GamificationPage'

const PILOTAGE_GROUP: NavItem = {
  to: '',
  label: 'Pilotage',
  icon: Gauge,
  children: [
    { to: '/direction',             label: 'Synthèse',    icon: LayoutDashboard, end: true },
    { to: '/direction/strategie',   label: 'Stratégie',   icon: Target },
    { to: '/direction/codir',       label: 'CODIR',       icon: MessageSquare },
    { to: '/direction/actions',     label: 'Actions',     icon: ListChecks },
    { to: '/direction/indicateurs', label: 'Indicateurs', icon: BarChart2 },
  ],
}

const QUALITE_GROUP: NavItem = {
  to: '',
  label: 'Qualité',
  icon: GitBranch,
  children: [
    { to: '/direction/processus', label: 'Processus', icon: GitBranch },
    { to: '/direction/terrain',   label: 'Terrain',   icon: AlertCircle },
    { to: '/direction/documents', label: 'Documents', icon: FolderOpen },
  ],
}

const BOTTOM_ITEMS: NavItem[] = [
  { to: '/direction',             label: 'Synthèse',  icon: LayoutDashboard, end: true },
  { to: '/direction/actions',     label: 'Actions',   icon: ListChecks },
  { to: '/direction/processus',   label: 'Processus', icon: GitBranch },
  { to: '/direction/documents',   label: 'Documents', icon: FolderOpen },
  { to: '/direction/membres',     label: 'Membres',   icon: Users },
]

export default function DirectorApp() {
  const breakpoint  = useBreakpoint()
  const isDesktop   = breakpoint === 'desktop'
  const hasSecurite = useHasModule('securite')

  const sidebarItems: NavItem[] = [
    PILOTAGE_GROUP,
    QUALITE_GROUP,
    ...(hasSecurite ? [{ to: '/direction/securite', label: 'Sécurité', icon: ShieldCheck } as NavItem] : []),
    { to: '/direction/membres',       label: 'Membres',       icon: Users },
    { to: '/direction/progression',   label: 'Progression',   icon: Award },
    { to: '/direction/notifications', label: 'Notifications', icon: Bell },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {isDesktop
        ? <Sidebar items={sidebarItems} profileTo="/direction/profil" />
        : <BottomNav items={BOTTOM_ITEMS.slice(0, 5)} />
      }

      <main className={isDesktop ? 'main-with-sidebar p-8' : 'main-with-bottom-nav p-4'}>
        <Routes>
          <Route path="/"               element={<DirectorDashboard />} />
          <Route path="/strategie"      element={<StrategyPage />} />
          <Route path="/codir"          element={<CodirPage />} />
          <Route path="/actions"        element={<ActionsPage />} />
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
