import { Routes, Route } from 'react-router-dom'
import {
  LayoutDashboard, ListChecks, GitBranch, FolderOpen,
  Users, Settings, BarChart2, Target, AlertCircle, ShieldCheck,
} from 'lucide-react'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { ORG_CONTEXT_KEY, useHasModule } from '@/hooks/useOrganisation'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import SuperAdminBanner from '@/components/layout/SuperAdminBanner'
import AdminDashboard from './AdminDashboard'
import AdminMembers from './AdminMembers'
import AdminSettings from './AdminSettings'
import Invitations from './Invitations'
import ImportUsers from './ImportUsers'
import ActionsPage from '@/pages/contributor/ActionsPage'
import StrategyPage from '@/pages/shared/StrategyPage'
import ProcessesPage from '@/pages/shared/ProcessesPage'
import IndicatorsPage from '@/pages/shared/IndicatorsPage'
import DocumentsPage from '@/pages/shared/DocumentsPage'
import ProfilePage from '@/pages/shared/ProfilePage'
import TerrainReportsManager from '@/pages/manager/TerrainReportsManager'
import SecurityApp from '@/pages/security/SecurityApp'

const BASE_NAV = [
  { to: '/admin',             label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/admin/actions',     label: 'Actions',          icon: ListChecks },
  { to: '/admin/strategie',   label: 'Stratégie',        icon: Target },
  { to: '/admin/processus',   label: 'Processus',        icon: GitBranch },
  { to: '/admin/indicateurs', label: 'Indicateurs',      icon: BarChart2 },
  { to: '/admin/terrain',     label: 'Terrain',          icon: AlertCircle },
  { to: '/admin/documents',   label: 'Documents',        icon: FolderOpen },
  { to: '/admin/membres',     label: 'Membres',          icon: Users },
  { to: '/admin/parametres',  label: 'Paramètres',       icon: Settings },
]

export default function AdminApp() {
  const breakpoint  = useBreakpoint()
  const isDesktop   = breakpoint === 'desktop'
  const hasBanner   = !!sessionStorage.getItem(ORG_CONTEXT_KEY)
  const hasSecurite = useHasModule('securite')

  const NAV_ITEMS = hasSecurite
    ? [...BASE_NAV.slice(0, 7), { to: '/admin/securite', label: 'Sécurité', icon: ShieldCheck }, ...BASE_NAV.slice(7)]
    : BASE_NAV

  return (
    <div className="min-h-screen bg-slate-50">
      <SuperAdminBanner />
      {isDesktop ? <Sidebar items={NAV_ITEMS} profileTo="/admin/profil" /> : <BottomNav items={NAV_ITEMS.slice(0, 5)} />}

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
          {/* Deep-link routes for Invitations and Import (not in sidebar) */}
          <Route path="/invitations"  element={<Invitations />} />
          <Route path="/import-users" element={<ImportUsers />} />
          <Route path="/parametres"   element={<AdminSettings />} />
          <Route path="/profil"       element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  )
}
