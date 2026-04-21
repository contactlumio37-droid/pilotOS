import { Routes, Route } from 'react-router-dom'
import { LayoutDashboard, Target, ListChecks, GitBranch, FolderOpen } from 'lucide-react'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import FeedbackButton from '@/components/layout/FeedbackButton'
import DirectorDashboard from './DirectorDashboard'
import StrategyPage from '@/pages/shared/StrategyPage'
import ActionsPage from '@/pages/contributor/ActionsPage'
import ProcessesPage from '@/pages/shared/ProcessesPage'
import DocumentsPage from '@/pages/shared/DocumentsPage'
import ProfilePage from '@/pages/shared/ProfilePage'

const NAV_ITEMS = [
  { to: '/direction',           label: 'Synthèse',   icon: LayoutDashboard, end: true },
  { to: '/direction/strategie', label: 'Stratégie',  icon: Target },
  { to: '/direction/actions',   label: 'Actions',    icon: ListChecks },
  { to: '/direction/processus', label: 'Processus',  icon: GitBranch },
  { to: '/direction/documents', label: 'Documents',  icon: FolderOpen },
]

export default function DirectorApp() {
  const breakpoint = useBreakpoint()
  const isDesktop = breakpoint === 'desktop'

  return (
    <div className="min-h-screen bg-slate-50">
      {isDesktop ? <Sidebar items={NAV_ITEMS} profileTo="/direction/profil" /> : <BottomNav items={NAV_ITEMS} />}

      <main className={isDesktop ? 'main-with-sidebar p-8' : 'main-with-bottom-nav p-4'}>
        <Routes>
          <Route path="/"          element={<DirectorDashboard />} />
          <Route path="/strategie" element={<StrategyPage />} />
          <Route path="/actions"   element={<ActionsPage />} />
          <Route path="/processus" element={<ProcessesPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/profil"    element={<ProfilePage />} />
        </Routes>
      </main>
      <FeedbackButton />
    </div>
  )
}
