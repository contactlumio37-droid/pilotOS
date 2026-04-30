import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth, signOut } from '@/hooks/useAuth'
import { useAppShell } from '@/hooks/useRole'
import { useOrganisation } from '@/hooks/useOrganisation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import MFARoute from '@/components/auth/MFARoute'
import ImpersonationBanner from '@/components/layout/ImpersonationBanner'
import FeedbackButton from '@/components/layout/FeedbackButton'
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
import InvitationAccept from '@/pages/auth/InvitationAccept'

// App shells — chargés à la demande selon le rôle
const TerrainApp     = lazy(() => import('@/pages/terrain/TerrainApp'))
const ContributorApp = lazy(() => import('@/pages/contributor/ContributorApp'))
const ManagerApp     = lazy(() => import('@/pages/manager/ManagerApp'))
const DirectorApp    = lazy(() => import('@/pages/director/DirectorApp'))
const AdminApp       = lazy(() => import('@/pages/admin/AdminApp'))
const SuperAdminApp  = lazy(() => import('@/pages/superadmin/SuperAdminApp'))

function GlobalFeedbackButton() {
  const { user, role } = useAuth()
  const { pathname } = useLocation()
  if (!user) return null
  if (pathname.startsWith('/superadmin') || pathname === '/' || pathname.startsWith('/pricing') || pathname.startsWith('/roadmap')) return null
  if (role === 'superadmin' && pathname.startsWith('/superadmin')) return null
  return <FeedbackButton />
}

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
      <GlobalFeedbackButton />
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

        {/* Invitation — route publique */}
        <Route path="/invitation/:token" element={<InvitationAccept />} />

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
  const { role, profile } = useAuth()
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
    // Existing user with a profile but no active membership → broken state
    if (profile) return <NoOrgScreen />
    // Brand new user without a profile → needs onboarding
    return <Navigate to="/onboarding" replace />
  }
  return <Navigate to={routes[shell]} replace />
}

function NoOrgScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center">
        <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🏢</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Aucune organisation trouvée</h1>
        <p className="text-slate-500 text-sm mb-6">
          Votre compte n'est associé à aucune organisation active.<br />
          Contactez votre administrateur pour obtenir l'accès.
        </p>
        <a
          href="mailto:support@pilotos.app"
          className="btn-primary inline-block mb-3"
        >
          Contacter l'administrateur
        </a>
        <button
          onClick={() => signOut()}
          className="block w-full text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  )
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
