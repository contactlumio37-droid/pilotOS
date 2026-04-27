import { Routes, Route } from 'react-router-dom'
import { LayoutDashboard, ListChecks, GitBranch, FolderOpen, AlertCircle, BarChart2, Target, ShieldCheck } from 'lucide-react'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useHasModule } from '@/hooks/useOrganisation'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import ManagerDashboard from './ManagerDashboard'
import TerrainReportsManager from './TerrainReportsManager'
import ActionsPage from '@/pages/contributor/ActionsPage'
import StrategyPage from '@/pages/shared/StrategyPage'
import ProcessesPage from '@/pages/shared/ProcessesPage'
import IndicatorsPage from '@/pages/shared/IndicatorsPage'
import DocumentsPage from '@/pages/shared/DocumentsPage'
import ProfilePage from '@/pages/shared/ProfilePage'
import SecurityApp from '@/pages/security/SecurityApp'

const BASE_NAV = [
  { to: '/manager',             label: 'Vue d\'ensemble', icon: LayoutDashboard, end: true },
  { to: '/manager/actions',     label: 'Actions',          icon: ListChecks },
  { to: '/manager/strategie',   label: 'Stratégie',        icon: Target },
  { to: '/manager/processus',   label: 'Processus',        icon: GitBranch },
  { to: '/manager/indicateurs', label: 'Indicateurs',      icon: BarChart2 },
  { to: '/manager/terrain',     label: 'Terrain',          icon: AlertCircle },
  { to: '/manager/documents',   label: 'Documents',        icon: FolderOpen },
]

export default function ManagerApp() {
  const breakpoint  = useBreakpoint()
  const isDesktop   = breakpoint === 'desktop'
  const hasSecurite = useHasModule('securite')

  const NAV_ITEMS = hasSecurite
    ? [...BASE_NAV, { to: '/manager/securite', label: 'Sécurité', icon: ShieldCheck }]
    : BASE_NAV

  return (
    <div className="min-h-screen bg-slate-50">
      {isDesktop ? <Sidebar items={NAV_ITEMS} profileTo="/manager/profil" /> : <BottomNav items={NAV_ITEMS.slice(0, 5)} />}

      <main className={isDesktop ? 'main-with-sidebar p-8' : 'main-with-bottom-nav p-4'}>
        <Routes>
          <Route path="/"            element={<ManagerDashboard />} />
          <Route path="/actions"     element={<ActionsPage />} />
          <Route path="/strategie"   element={<StrategyPage />} />
          <Route path="/processus"   element={<ProcessesPage />} />
          <Route path="/indicateurs" element={<IndicatorsPage />} />
          <Route path="/terrain"     element={<TerrainReportsManager />} />
          <Route path="/documents"   element={<DocumentsPage />} />
          <Route path="/securite/*"  element={<SecurityApp />} />
          <Route path="/profil"      element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  )
}
