import { Routes, Route } from 'react-router-dom'
import { LayoutDashboard, FolderOpen, GitBranch, BarChart2 } from 'lucide-react'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import type { NavItem } from '@/components/layout/Sidebar'
import ReaderDashboard from './ReaderDashboard'
import DocumentsPage from '@/pages/shared/DocumentsPage'
import ProcessesPage from '@/pages/shared/ProcessesPage'
import IndicatorsPage from '@/pages/shared/IndicatorsPage'
import ProfilePage from '@/pages/shared/ProfilePage'
import NotificationsPage from '@/pages/shared/NotificationsPage'

const NAV_ITEMS: NavItem[] = [
  { to: '/reader',             label: 'Accueil',     icon: LayoutDashboard, end: true },
  { to: '/reader/documents',   label: 'Documents',   icon: FolderOpen },
  { to: '/reader/processus',   label: 'Processus',   icon: GitBranch },
  { to: '/reader/indicateurs', label: 'Indicateurs', icon: BarChart2 },
]

const BOTTOM_ITEMS: NavItem[] = [
  { to: '/reader',             label: 'Accueil',     icon: LayoutDashboard, end: true },
  { to: '/reader/documents',   label: 'Documents',   icon: FolderOpen },
  { to: '/reader/processus',   label: 'Processus',   icon: GitBranch },
  { to: '/reader/indicateurs', label: 'Indicateurs', icon: BarChart2 },
]

export default function ReaderApp() {
  const breakpoint = useBreakpoint()
  const isDesktop = breakpoint === 'desktop'

  return (
    <div className="min-h-screen bg-slate-50">
      {isDesktop
        ? <Sidebar items={NAV_ITEMS} profileTo="/reader/profil" />
        : <BottomNav items={BOTTOM_ITEMS} />
      }
      <main className={isDesktop ? 'main-with-sidebar p-8' : 'main-with-bottom-nav p-4'}>
        <Routes>
          <Route path="/"            element={<ReaderDashboard />} />
          <Route path="/documents"   element={<DocumentsPage />} />
          <Route path="/processus"   element={<ProcessesPage />} />
          <Route path="/indicateurs" element={<IndicatorsPage />} />
          <Route path="/profil"        element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Routes>
      </main>
    </div>
  )
}
