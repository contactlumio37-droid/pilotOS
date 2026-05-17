import { Routes, Route } from 'react-router-dom'
import { LayoutDashboard, Target, ListChecks, GitBranch, FolderOpen, BarChart2, AlertCircle, Users, SmilePlus, Presentation, TrendingUp, ShieldCheck } from 'lucide-react'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useHasModule } from '@/hooks/useOrganisation'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import DirectorDashboard from './DirectorDashboard'
import StrategyPage from '@/pages/shared/StrategyPage'
import ActionsPage from '@/pages/shared/ActionsPage'
import ProcessesPage from '@/pages/shared/ProcessesPage'
import IndicatorsPage from '@/pages/shared/IndicatorsPage'
import DocumentsPage from '@/pages/shared/DocumentsPage'
import SignaturesPage from '@/pages/shared/SignaturesPage'
import MembersPage from '@/pages/shared/MembersPage'
import TerrainReportsManager from '@/pages/shared/TerrainReportsManager'
import ProfilePage from '@/pages/shared/ProfilePage'
import SecurityApp from '@/pages/shared/SecurityApp'
import TeamPage from '@/pages/manager/TeamPage'
import CodirHubPage from './CodirHubPage'
import BIHubPage from './BIHubPage'
import NotificationsPage from '@/pages/shared/NotificationsPage'

const BASE_NAV_ITEMS = [
  { to: '/direction',             label: 'Synthèse',    icon: LayoutDashboard, end: true },
  { to: '/direction/strategie',   label: 'Stratégie',   icon: Target },
  { to: '/direction/actions',     label: 'Actions',     icon: ListChecks },
  { to: '/direction/processus',   label: 'Processus',   icon: GitBranch },
  { to: '/direction/indicateurs', label: 'Indicateurs', icon: BarChart2 },
  { to: '/direction/terrain',     label: 'Terrain',     icon: AlertCircle },
  { to: '/direction/equipe',      label: 'Équipe',      icon: SmilePlus },
  { to: '/direction/documents',   label: 'Documents',   icon: FolderOpen },
  { to: '/direction/membres',     label: 'Membres',     icon: Users },
  { to: '/direction/codir',       label: 'CODIR',       icon: Presentation },
  { to: '/direction/bi',          label: 'BI',          icon: TrendingUp },
]

const BOTTOM_ITEMS = [
  { to: '/direction',           label: 'Synthèse',    icon: LayoutDashboard, end: true },
  { to: '/direction/strategie', label: 'Stratégie',   icon: Target },
  { to: '/direction/actions',   label: 'Actions',     icon: ListChecks },
  { to: '/direction/documents', label: 'Documents',   icon: FolderOpen },
  { to: '/direction/membres',   label: 'Membres',     icon: Users },
]

export default function DirectorApp() {
  const breakpoint  = useBreakpoint()
  const isDesktop   = breakpoint === 'desktop'
  const hasSecurite = useHasModule('securite')

  const navItems = [
    ...BASE_NAV_ITEMS,
    ...(hasSecurite ? [{ to: '/direction/securite', label: 'Sécurité', icon: ShieldCheck }] : []),
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {isDesktop ? <Sidebar items={navItems} profileTo="/direction/profil" /> : <BottomNav items={BOTTOM_ITEMS} />}

      <main className={isDesktop ? 'main-with-sidebar p-8' : 'main-with-bottom-nav p-4'}>
        <Routes>
          <Route path="/"            element={<DirectorDashboard />} />
          <Route path="/strategie"   element={<StrategyPage />} />
          <Route path="/actions"     element={<ActionsPage />} />
          <Route path="/processus"   element={<ProcessesPage />} />
          <Route path="/indicateurs" element={<IndicatorsPage />} />
          <Route path="/terrain"     element={<TerrainReportsManager />} />
          <Route path="/documents"   element={<DocumentsPage />} />
          <Route path="/signatures"  element={<SignaturesPage />} />
          <Route path="/membres"     element={<MembersPage />} />
          <Route path="/equipe"      element={<TeamPage />} />
          <Route path="/codir"       element={<CodirHubPage />} />
          <Route path="/bi"          element={<BIHubPage />} />
          <Route path="/securite/*"      element={<SecurityApp />} />
          <Route path="/profil"          element={<ProfilePage />} />
          <Route path="/notifications"   element={<NotificationsPage />} />
        </Routes>
      </main>
    </div>
  )
}
