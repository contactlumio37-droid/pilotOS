import { Routes, Route } from 'react-router-dom'
import {
  LayoutDashboard, ListChecks, FolderOpen,
  AlertCircle, BarChart2, Target, ShieldCheck, Users, Siren,
} from 'lucide-react'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useHasModule } from '@/hooks/useOrganisation'
import Sidebar from '@/components/layout/Sidebar'
import type { NavItem } from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import { QUICK_DECLARE_EVENT } from '@/components/features/QuickDeclareButton'
import ManagerDashboard from './ManagerDashboard'
import TerrainReportsManager from '@/pages/shared/TerrainReportsManager'
import ActionsPage from '@/pages/shared/ActionsPage'
import StrategyPage from '@/pages/shared/StrategyPage'
import ProcessesPage from '@/pages/shared/ProcessesPage'
import IndicatorsPage from '@/pages/shared/IndicatorsPage'
import DocumentsPage from '@/pages/shared/DocumentsPage'
import MembersPage from '@/pages/shared/MembersPage'
import ProfilePage from '@/pages/shared/ProfilePage'
import SecurityApp from '@/pages/shared/SecurityApp'

// Qualité et Sécurité accessibles via Dashboard onglets — retirés du menu latéral
const NAV_ITEMS: NavItem[] = [
  { to: '/manager',             label: 'Dashboard',   icon: LayoutDashboard, end: true },
  { to: '/manager/actions',     label: 'Actions',     icon: ListChecks },
  { to: '/manager/strategie',   label: 'Stratégie',   icon: Target },
  { to: '/manager/indicateurs', label: 'Indicateurs', icon: BarChart2 },
  { to: '/manager/terrain',     label: 'Terrain',     icon: AlertCircle },
  { to: '/manager/documents',   label: 'Documents',   icon: FolderOpen },
  { to: '/manager/membres',     label: 'Membres',     icon: Users },
]

const BOTTOM_ITEMS: NavItem[] = [
  { to: '/manager',             label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/manager/terrain',     label: 'Terrain',    icon: AlertCircle },
  { to: '/manager/documents',   label: 'Documents',  icon: FolderOpen },
  { to: '/manager/membres',     label: 'Membres',    icon: Users },
]

export default function ManagerApp() {
  const breakpoint  = useBreakpoint()
  const isDesktop   = breakpoint === 'desktop'
  const hasSecurite = useHasModule('securite')

  // hasSecurite kept — Sécurité accessible via Dashboard onglets
  void hasSecurite

  const sidebarItems: NavItem[] = NAV_ITEMS

  return (
    <div className="min-h-screen bg-slate-50">
      {isDesktop
        ? <Sidebar items={sidebarItems} profileTo="/manager/profil" />
        : (
          <BottomNav
            items={BOTTOM_ITEMS}
            centerAction={
              <button
                onClick={() => window.dispatchEvent(new Event(QUICK_DECLARE_EVENT))}
                className="w-12 h-12 bg-danger rounded-2xl flex items-center justify-center shadow-lg shadow-danger/30 -mt-4"
                title="Déclaration rapide"
              >
                <Siren className="w-6 h-6 text-white" />
              </button>
            }
          />
        )
      }

      <main className={isDesktop ? 'main-with-sidebar p-8' : 'main-with-bottom-nav p-4'}>
        <Routes>
          <Route path="/"            element={<ManagerDashboard />} />
          <Route path="/actions"     element={<ActionsPage />} />
          <Route path="/strategie"   element={<StrategyPage />} />
          <Route path="/processus"   element={<ProcessesPage />} />
          <Route path="/indicateurs" element={<IndicatorsPage />} />
          <Route path="/terrain"     element={<TerrainReportsManager />} />
          <Route path="/documents"   element={<DocumentsPage />} />
          <Route path="/membres"     element={<MembersPage />} />
          <Route path="/securite/*"  element={<SecurityApp />} />
          <Route path="/profil"      element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  )
}
