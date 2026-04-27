import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAppShell } from '@/hooks/useRole'
import { useOrganisation } from '@/hooks/useOrganisation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import MFARoute from '@/components/auth/MFARoute'
import ImpersonationBanner from '@/components/layout/ImpersonationBanner'
import { ToastProvider } from '@/components/ui/Toast'

// Pages publiques (petit poids — pas de lazy)
import LandingPage from '@/pages/public/LandingPage'
import PricingPage from '@/pages/public/PricingPage'
import RoadmapPage from '@/pages/public/RoadmapPage'

// Auth
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import OnboardingPage from '@/pages/auth/OnboardingPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import UpdatePasswordPage from '@/pages/auth/UpdatePasswordPage'
import MFASetupPage from '@/pages/auth/MFASetupPage'
import MFAVerifyPage from '@/pages/auth/MFAVerifyPage'

// App shells — chargés à la demande selon le rôle
const TerrainApp     = lazy(() => import('@/pages/terrain/TerrainApp'))
const ContributorApp = lazy(() => import('@/pages/contributor/ContributorApp'))
const ManagerApp     = lazy(() => import('@/pages/manager/ManagerApp'))
const DirectorApp    = lazy(() => import('@/pages/director/DirectorApp'))
const AdminApp       = lazy(() => import('@/pages/admin/AdminApp'))
const SuperAdminApp  = lazy(() => import('@/pages/superadmin/SuperAdminApp'))

function AppRouter() {
  const { user, loading, isImpersonating } = useAuth()
  const { loading: orgLoading } = useOrganisation()
  const appShell = useAppShell()

  // Wait for both useAuth AND useOrganisation before evaluating redirects.
  // Without this guard, AppRedirect fires while useOrganisation is still
  // fetching (shell = null) and sends authenticated users to /onboarding.
  if (loading || (!!user && orgLoading)) return <LoadingScreen />

  return (
    <>
      <ImpersonationBanner />
      {isImpersonating && <div className="h-10 shrink-0" />}
      <Routes>
        {/* Site public */}
        <Route path="/"        element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/roadmap" element={<RoadmapPage />} />

        {/* Auth */}
        <Route path="/login"          element={user ? <AppRedirect shell={appShell} /> : <LoginPage />} />
        <Route path="/register"       element={user ? <AppRedirect shell={appShell} /> : <RegisterPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/update-password" element={<UpdatePasswordPage />} />

        {/* MFA */}
        <Route path="/mfa/verify" element={<ProtectedRoute><MFAVerifyPage /></ProtectedRoute>} />
        <Route path="/mfa/setup"  element={<ProtectedRoute><MFASetupPage /></ProtectedRoute>} />

        {/* Onboarding */}
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

        {/* Apps par rôle — lazy loaded */}
        <Route path="/terrain/*"    element={<ProtectedRoute><MFARoute><Suspense fallback={<LoadingScreen />}><TerrainApp /></Suspense></MFARoute></ProtectedRoute>} />
        <Route path="/app/*"        element={<ProtectedRoute><MFARoute><Suspense fallback={<LoadingScreen />}><ContributorApp /></Suspense></MFARoute></ProtectedRoute>} />
        <Route path="/manager/*"    element={<ProtectedRoute><MFARoute><Suspense fallback={<LoadingScreen />}><ManagerApp /></Suspense></MFARoute></ProtectedRoute>} />
        <Route path="/direction/*"  element={<ProtectedRoute><MFARoute><Suspense fallback={<LoadingScreen />}><DirectorApp /></Suspense></MFARoute></ProtectedRoute>} />
        <Route path="/admin/*"      element={<ProtectedRoute><MFARoute><Suspense fallback={<LoadingScreen />}><AdminApp /></Suspense></MFARoute></ProtectedRoute>} />
        <Route path="/superadmin/*" element={<ProtectedRoute><MFARoute><Suspense fallback={<LoadingScreen />}><SuperAdminApp /></Suspense></MFARoute></ProtectedRoute>} />

        {/* Catch-all */}
        <Route path="*" element={user ? <AppRedirect shell={appShell} /> : <Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

function AppRedirect({ shell }: { shell: ReturnType<typeof useAppShell> }) {
  const { role } = useAuth()
  const routes: Record<NonNullable<typeof shell>, string> = {
    terrain: '/terrain',
    contributor: '/app',
    manager: '/manager',
    director: '/direction',
    admin: '/admin',
    superadmin: '/superadmin',
  }
  if (!shell) {
    if (role === 'superadmin') return <Navigate to="/superadmin" replace />
    return <Navigate to="/onboarding" replace />
  }
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
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </BrowserRouter>
  )
}
