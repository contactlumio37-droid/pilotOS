import { Routes, Route } from 'react-router-dom'
import { LayoutDashboard, Target, ListChecks, GitBranch, FolderOpen } from 'lucide-react'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import DirectorDashboard from './DirectorDashboard'

const NAV_ITEMS = [
  { to: '/direction', label: 'Synthèse', icon: LayoutDashboard, end: true },
  { to: '/direction/strategie', label: 'Stratégie', icon: Target },
  { to: '/direction/actions', label: 'Actions', icon: ListChecks },
  { to: '/direction/processus', label: 'Processus', icon: GitBranch },
  { to: '/direction/documents', label: 'Documents', icon: FolderOpen },
]

export default function DirectorApp() {
  const breakpoint = useBreakpoint()
  const isDesktop = breakpoint === 'desktop'

  return (
    <div className="min-h-screen bg-slate-50">
      {isDesktop ? (
        <Sidebar items={NAV_ITEMS} />
      ) : (
        <BottomNav items={NAV_ITEMS} />
      )}

      <main className={isDesktop ? 'main-with-sidebar p-8' : 'main-with-bottom-nav p-4'}>
        <Routes>
          <Route path="/" element={<DirectorDashboard />} />
        </Routes>
      </main>
    </div>
  )
}
