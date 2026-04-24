import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAppShell } from '@/hooks/useRole'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import MFARoute from '@/components/auth/MFARoute'

import ImpersonationBanner from '@/components/layout/ImpersonationBanner'

// Pages publiques
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

// App shells par rôle
import TerrainApp from '@/pages/terrain/TerrainApp'
import ContributorApp from '@/pages/contributor/ContributorApp'
import ManagerApp from '@/pages/manager/ManagerApp'
import DirectorApp from '@/pages/director/DirectorApp'
import AdminApp from '@/pages/admin/AdminApp'
import SuperAdminApp from '@/pages/superadmin/SuperAdminApp'

function AppRouter() {
  const { user, loading, isImpersonating } = useAuth()
  const appShell = useAppShell()

  if (loading) return <LoadingScreen />

  return (
    <>
      <ImpersonationBanner />
      {/* Spacer pour compenser le banner fixe quand actif */}
      {isImpersonating && <div className="h-10 shrink-0" />}
      <Routes>
      {/* Site public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/roadmap" element={<RoadmapPage />} />

      {/* Auth — redirige si déjà connecté */}
      <Route path="/login" element={user ? <AppRedirect shell={appShell} /> : <LoginPage />} />
      <Route path="/register" element={user ? <AppRedirect shell={appShell} /> : <RegisterPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/update-password" element={<UpdatePasswordPage />} />

      {/* MFA — disponible uniquement si connecté */}
      <Route path="/mfa/verify" element={<ProtectedRoute><MFAVerifyPage /></ProtectedRoute>} />
      <Route path="/mfa/setup" element={<ProtectedRoute><MFASetupPage /></ProtectedRoute>} />

      {/* Onboarding */}
      <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

      {/* Apps par rôle — protégées + vérification MFA */}
      <Route path="/terrain/*" element={<ProtectedRoute><MFARoute><TerrainApp /></MFARoute></ProtectedRoute>} />
      <Route path="/app/*" element={<ProtectedRoute><MFARoute><ContributorApp /></MFARoute></ProtectedRoute>} />
      <Route path="/manager/*" element={<ProtectedRoute><MFARoute><ManagerApp /></MFARoute></ProtectedRoute>} />
      <Route path="/direction/*" element={<ProtectedRoute><MFARoute><DirectorApp /></MFARoute></ProtectedRoute>} />
      <Route path="/admin/*" element={<ProtectedRoute><MFARoute><AdminApp /></MFARoute></ProtectedRoute>} />
      <Route path="/superadmin/*" element={<ProtectedRoute><MFARoute><SuperAdminApp /></MFARoute></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={user ? <AppRedirect shell={appShell} /> : <Navigate to="/" replace />} />
    </Routes>
    </>
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
  if (!shell) return <Navigate to="/onboarding" replace />
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
