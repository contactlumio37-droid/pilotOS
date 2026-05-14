import { Routes, Route } from 'react-router-dom'
import {
  LayoutDashboard, ListChecks, FolderOpen,
  Users, Settings, BarChart2, Target, AlertCircle, ShieldCheck, Siren,
} from 'lucide-react'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { ORG_CONTEXT_KEY, useHasModule } from '@/hooks/useOrganisation'
import Sidebar from '@/components/layout/Sidebar'
import type { NavItem } from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import SuperAdminBanner from '@/components/layout/SuperAdminBanner'
import AdminDashboard from './AdminDashboard'
import AdminMembers from './AdminMembers'
import AdminSettings from './AdminSettings'
import Invitations from './Invitations'
import ImportUsers from './ImportUsers'
import ActionsPage from '@/pages/shared/ActionsPage'
import StrategyPage from '@/pages/shared/StrategyPage'
import ProcessesPage from '@/pages/shared/ProcessesPage'
import IndicatorsPage from '@/pages/shared/IndicatorsPage'
import DocumentsPage from '@/pages/shared/DocumentsPage'
import ProfilePage from '@/pages/shared/ProfilePage'
import TerrainReportsManager from '@/pages/shared/TerrainReportsManager'
import SecurityApp from '@/pages/shared/SecurityApp'
import { QUICK_DECLARE_EVENT } from '@/components/features/QuickDeclareButton'

// Qualité et Sécurité accessibles via Dashboard onglets — retirés du menu latéral
const NAV_ITEMS: NavItem[] = [
  { to: '/admin',             label: 'Dashboard',   icon: LayoutDashboard, end: true },
  { to: '/admin/actions',     label: 'Actions',     icon: ListChecks },
  { to: '/admin/strategie',   label: 'Stratégie',   icon: Target },
  { to: '/admin/indicateurs', label: 'Indicateurs', icon: BarChart2 },
  { to: '/admin/terrain',     label: 'Terrain',     icon: AlertCircle },
  { to: '/admin/documents',   label: 'Documents',   icon: FolderOpen },
  { to: '/admin/membres',     label: 'Membres',     icon: Users },
  { to: '/admin/parametres',  label: 'Paramètres',  icon: Settings },
]

const BOTTOM_ITEMS: NavItem[] = [
  { to: '/admin',             label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/admin/terrain',     label: 'Terrain',    icon: AlertCircle },
  { to: '/admin/documents',   label: 'Documents',  icon: FolderOpen },
  { to: '/admin/membres',     label: 'Membres',    icon: Users },
]

export default function AdminApp() {
  const breakpoint  = useBreakpoint()
  const isDesktop   = breakpoint === 'desktop'
  const hasBanner   = !!sessionStorage.getItem(ORG_CONTEXT_KEY)
  const hasSecurite = useHasModule('securite')

  // hasSecurite kept — Sécurité accessible via Dashboard onglets
  void hasSecurite

  return (
    <div className="min-h-screen bg-slate-50">
      <SuperAdminBanner />
      {isDesktop
        ? <Sidebar items={NAV_ITEMS} profileTo="/admin/profil" />
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

      <main className={`${isDesktop ? 'main-with-sidebar p-8' : 'main-with-bottom-nav p-4'} ${hasBanner ? 'pt-12' : ''}`}>
        <Routes>
          <Route path="/"            element={<AdminDashboard />} />
          <Route path="/actions"     element={<ActionsPage />} />
          <Route path="/strategie"   element={<StrategyPage />} />
          <Route path="/processus"   element={<ProcessesPage />} />
          <Route path="/indicateurs" element={<IndicatorsPage />} />
          <Route path="/terrain"     element={<TerrainReportsManager />} />
          <Route path="/documents"   element={<DocumentsPage />} />
          <Route path="/securite/*"  element={<SecurityApp />} />
          <Route path="/membres"     element={<AdminMembers />} />
          <Route path="/invitations"  element={<Invitations />} />
          <Route path="/import-users" element={<ImportUsers />} />
          <Route path="/parametres"   element={<AdminSettings />} />
          <Route path="/profil"       element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  )
}
