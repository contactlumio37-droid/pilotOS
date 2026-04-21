import { Routes, Route } from 'react-router-dom'
import { LayoutDashboard, ListChecks, GitBranch, FolderOpen, AlertCircle, BarChart2, Target } from 'lucide-react'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import ManagerDashboard from './ManagerDashboard'
import TerrainReportsManager from './TerrainReportsManager'
import ActionsPage from '@/pages/contributor/ActionsPage'
import StrategyPage from '@/pages/shared/StrategyPage'

const NAV_ITEMS = [
  { to: '/manager',           label: 'Vue d\'ensemble', icon: LayoutDashboard, end: true },
  { to: '/manager/actions',   label: 'Actions',          icon: ListChecks },
  { to: '/manager/strategie', label: 'Stratégie',         icon: Target },
  { to: '/manager/processus', label: 'Processus',         icon: GitBranch },
  { to: '/manager/indicateurs', label: 'Indicateurs',    icon: BarChart2 },
  { to: '/manager/terrain',   label: 'Terrain',           icon: AlertCircle },
  { to: '/manager/documents', label: 'Documents',         icon: FolderOpen },
]

export default function ManagerApp() {
  const breakpoint = useBreakpoint()
  const isDesktop = breakpoint === 'desktop'

  return (
    <div className="min-h-screen bg-slate-50">
      {isDesktop ? <Sidebar items={NAV_ITEMS} /> : <BottomNav items={NAV_ITEMS.slice(0, 5)} />}

      <main className={isDesktop ? 'main-with-sidebar p-8' : 'main-with-bottom-nav p-4'}>
        <Routes>
          <Route path="/"          element={<ManagerDashboard />} />
          <Route path="/actions"   element={<ActionsPage />} />
          <Route path="/strategie" element={<StrategyPage />} />
          <Route path="/terrain"   element={<TerrainReportsManager />} />
        </Routes>
      </main>
    </div>
  )
}
