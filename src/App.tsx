import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAppShell } from '@/hooks/useRole'

// Pages publiques
import LandingPage from '@/pages/public/LandingPage'
import PricingPage from '@/pages/public/PricingPage'
import RoadmapPage from '@/pages/public/RoadmapPage'

// Auth
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import OnboardingPage from '@/pages/auth/OnboardingPage'

// App shells par rôle
import TerrainApp from '@/pages/terrain/TerrainApp'
import ContributorApp from '@/pages/contributor/ContributorApp'
import ManagerApp from '@/pages/manager/ManagerApp'
import DirectorApp from '@/pages/director/DirectorApp'
import AdminApp from '@/pages/admin/AdminApp'
import SuperAdminApp from '@/pages/superadmin/SuperAdminApp'

function AppRouter() {
  const { user, loading } = useAuth()
  const appShell = useAppShell()

  if (loading) return <LoadingScreen />

  return (
    <Routes>
      {/* Site public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/roadmap" element={<RoadmapPage />} />

      {/* Auth */}
      <Route path="/login" element={user ? <AppRedirect shell={appShell} /> : <LoginPage />} />
      <Route path="/register" element={user ? <AppRedirect shell={appShell} /> : <RegisterPage />} />
      <Route path="/onboarding" element={user ? <OnboardingPage /> : <Navigate to="/login" replace />} />

      {/* Apps par rôle — protégées */}
      <Route path="/terrain/*" element={user ? <TerrainApp /> : <Navigate to="/login" replace />} />
      <Route path="/app/*" element={user ? <ContributorApp /> : <Navigate to="/login" replace />} />
      <Route path="/manager/*" element={user ? <ManagerApp /> : <Navigate to="/login" replace />} />
      <Route path="/direction/*" element={user ? <DirectorApp /> : <Navigate to="/login" replace />} />
      <Route path="/admin/*" element={user ? <AdminApp /> : <Navigate to="/login" replace />} />
      <Route path="/superadmin/*" element={user ? <SuperAdminApp /> : <Navigate to="/login" replace />} />

      {/* Catch-all */}
      <Route path="*" element={user ? <AppRedirect shell={appShell} /> : <Navigate to="/" replace />} />
    </Routes>
  )
}

function AppRedirect({ shell }: { shell: ReturnType<typeof useAppShell> }) {
  const routes: Record<NonNullable<typeof shell>, string> = {
    terrain: '/terrain',
    contributor: '/app',
    manager: '/manager',
    director: '/direction',
    admin: '/admin',
    superadmin: '/superadmin',
  }
  if (!shell) return <Navigate to="/login" replace />
  return <Navigate to={routes[shell]} replace />
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Chargement...</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  )
}
