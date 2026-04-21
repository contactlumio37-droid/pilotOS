import { Routes, Route } from 'react-router-dom'
import {
  LayoutDashboard, ListChecks, GitBranch, FolderOpen,
  Users, Settings, BarChart2, Target, AlertCircle,
} from 'lucide-react'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import FeedbackButton from '@/components/layout/FeedbackButton'
import AdminDashboard from './AdminDashboard'
import AdminMembers from './AdminMembers'
import AdminSettings from './AdminSettings'
import ActionsPage from '@/pages/contributor/ActionsPage'
import StrategyPage from '@/pages/shared/StrategyPage'
import ProcessesPage from '@/pages/shared/ProcessesPage'
import IndicatorsPage from '@/pages/shared/IndicatorsPage'
import DocumentsPage from '@/pages/shared/DocumentsPage'
import ProfilePage from '@/pages/shared/ProfilePage'
import TerrainReportsManager from '@/pages/manager/TerrainReportsManager'

const NAV_ITEMS = [
  { to: '/admin',             label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/admin/actions',     label: 'Actions',          icon: ListChecks },
  { to: '/admin/strategie',   label: 'Stratégie',         icon: Target },
  { to: '/admin/processus',   label: 'Processus',         icon: GitBranch },
  { to: '/admin/indicateurs', label: 'Indicateurs',       icon: BarChart2 },
  { to: '/admin/terrain',     label: 'Terrain',           icon: AlertCircle },
  { to: '/admin/documents',   label: 'Documents',         icon: FolderOpen },
  { to: '/admin/membres',     label: 'Membres',           icon: Users },
  { to: '/admin/parametres',  label: 'Paramètres',        icon: Settings },
]

export default function AdminApp() {
  const breakpoint = useBreakpoint()
  const isDesktop = breakpoint === 'desktop'

  return (
    <div className="min-h-screen bg-slate-50">
      {isDesktop ? <Sidebar items={NAV_ITEMS} profileTo="/admin/profil" /> : <BottomNav items={NAV_ITEMS.slice(0, 5)} />}

      <main className={isDesktop ? 'main-with-sidebar p-8' : 'main-with-bottom-nav p-4'}>
        <Routes>
          <Route path="/"          element={<AdminDashboard />} />
          <Route path="/actions"      element={<ActionsPage />} />
          <Route path="/strategie"    element={<StrategyPage />} />
          <Route path="/processus"    element={<ProcessesPage />} />
          <Route path="/indicateurs"  element={<IndicatorsPage />} />
          <Route path="/terrain"      element={<TerrainReportsManager />} />
          <Route path="/documents"    element={<DocumentsPage />} />
          <Route path="/membres"      element={<AdminMembers />} />
          <Route path="/parametres"   element={<AdminSettings />} />
          <Route path="/profil"        element={<ProfilePage />} />
        </Routes>
      </main>
      <FeedbackButton />
    </div>
  )
}
