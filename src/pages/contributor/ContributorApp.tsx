import { Routes, Route } from 'react-router-dom'
import { LayoutDashboard, ListChecks, FolderOpen, GitBranch } from 'lucide-react'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import DashboardPage from './DashboardPage'
import ActionsPage from './ActionsPage'
import ProcessesPage from './ProcessesPage'
import DocumentsPage from './DocumentsPage'

const NAV_ITEMS = [
  { to: '/app', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/app/actions', label: 'Actions', icon: ListChecks },
  { to: '/app/processus', label: 'Processus', icon: GitBranch },
  { to: '/app/documents', label: 'Documents', icon: FolderOpen },
]

export default function ContributorApp() {
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
          <Route path="/" element={<DashboardPage />} />
          <Route path="/actions" element={<ActionsPage />} />
          <Route path="/processus" element={<ProcessesPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
        </Routes>
      </main>
    </div>
  )
}
