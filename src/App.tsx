import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth, signOut } from '@/hooks/useAuth'
import { useAppShell } from '@/hooks/useRole'
import { useOrganisation } from '@/hooks/useOrganisation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import MFARoute from '@/components/auth/MFARoute'
import ImpersonationBanner from '@/components/layout/ImpersonationBanner'
import FeedbackButton from '@/components/layout/FeedbackButton'
import QuickDeclareButton from '@/components/features/QuickDeclareButton'
import { ToastProvider } from '@/components/ui/Toast'
import { SUPPORT_EMAIL } from '@/lib/constants'

// Pages publiques (petit poids — pas de lazy)
import LandingPage from '@/pages/public/LandingPage'
import PricingPage from '@/pages/public/PricingPage'
import RoadmapPage from '@/pages/public/RoadmapPage'
import DynamicPage from '@/pages/public/DynamicPage'
import DemoPage from '@/pages/public/DemoPage'
import { BlogList, BlogPostPage } from '@/pages/public/BlogPage'
import SignPage from '@/pages/public/SignPage'
import CommandPalette from '@/components/features/CommandPalette'

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
const ReaderApp      = lazy(() => import('@/pages/reader/ReaderApp'))
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

function GlobalQuickDeclare() {
  const { user, role } = useAuth()
  const { pathname } = useLocation()
  if (!user) return null
  if (role === 'terrain' || role === 'reader') return null
  if (pathname.startsWith('/superadmin') || pathname === '/' || pathname.startsWith('/pricing') || pathname.startsWith('/roadmap')) return null
  return <QuickDeclareButton />
}

function ConfirmNewsletter() {
  const token = new URLSearchParams(window.location.search).get('token') ?? ''
  const { data, isLoading } = useQuery({
    queryKey: ['confirm_newsletter', token],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/confirm-newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ token }),
      })
      return res.json() as Promise<{ ok?: boolean; error?: string }>
    },
  })
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center max-w-sm px-6">
        {isLoading ? (
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
        ) : data?.ok ? (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Inscription confirmée !</h1>
            <p className="text-slate-500 text-sm">Vous recevrez nos prochains articles et actualités.</p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Lien invalide</h1>
            <p className="text-slate-500 text-sm">{data?.error ?? 'Ce lien est expiré ou déjà utilisé.'}</p>
          </>
        )}
      </div>
    </div>
  )
}

function UnsubscribeNewsletter() {
  const token = new URLSearchParams(window.location.search).get('token') ?? ''
  const { data, isLoading } = useQuery({
    queryKey: ['unsubscribe_newsletter', token],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/unsubscribe-newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ token }),
      })
      return res.json() as Promise<{ ok?: boolean; error?: string }>
    },
  })
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center max-w-sm px-6">
        {isLoading ? (
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
        ) : data?.ok ? (
          <>
            <div className="text-5xl mb-4">👋</div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Désinscription effectuée</h1>
            <p className="text-slate-500 text-sm">Vous ne recevrez plus nos emails. Vous pouvez vous réinscrire à tout moment.</p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Lien invalide</h1>
            <p className="text-slate-500 text-sm">{data?.error ?? 'Ce lien est expiré.'}</p>
          </>
        )}
      </div>
    </div>
  )
}

function SuperadminToAdminRedirect({ children }: { children: ReactNode }) {
  const { role } = useAuth()
  if (role === 'superadmin') return <Navigate to="/admin" replace />
  return <>{children}</>
}

function SuperadminGuard({ children }: { children: ReactNode }) {
  const { role, loading } = useAuth()
  if (loading) return null
  if (role !== 'superadmin') return <Navigate to="/app" replace />
  return <>{children}</>
}

function AppRouter() {
  const { user, loading, isImpersonating } = useAuth()
  const { loading: orgLoading, isError: orgError } = useOrganisation()
  const appShell = useAppShell()

  // Wait for both useAuth AND useOrganisation before evaluating redirects.
  // Without this guard, AppRedirect fires while useOrganisation is still
  // fetching (shell = null) and sends authenticated users to /onboarding.
  if (loading || (!!user && orgLoading)) return <LoadingScreen />

  // If authenticated but data failed to load (e.g. RLS error / network) — show
  // a retry screen rather than silently bouncing to /onboarding.
  if (user && orgError) return <ConnectionErrorScreen />

  return (
    <>
      <ImpersonationBanner />
      {isImpersonating && <div className="h-10 shrink-0" />}
      <GlobalFeedbackButton />
      <GlobalQuickDeclare />
      {user && <CommandPalette />}
      <Routes>
        {/* Site public */}
        <Route path="/"                 element={<LandingPage />} />
        <Route path="/pricing"          element={<PricingPage />} />
        <Route path="/roadmap"          element={<RoadmapPage />} />
        <Route path="/demo"             element={<DemoPage />} />
        <Route path="/cgu"              element={<DynamicPage forceSlug="cgu" />} />
        <Route path="/confidentialite"  element={<DynamicPage forceSlug="confidentialite" />} />
        <Route path="/mentions-legales" element={<DynamicPage forceSlug="mentions-legales" />} />
        <Route path="/blog"             element={<BlogList />} />
        <Route path="/blog/:slug"       element={<BlogPostPage />} />
        <Route path="/p/:slug"          element={<DynamicPage />} />

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
        <Route path="/invitation/:token"    element={<InvitationAccept />} />
        <Route path="/confirm-newsletter"  element={<ConfirmNewsletter />} />
        <Route path="/unsubscribe"         element={<UnsubscribeNewsletter />} />
        <Route path="/sign/:token"         element={<SignPage />} />

        {/* Apps par rôle — lazy loaded */}
        <Route path="/terrain/*"    element={<ProtectedRoute><MFARoute><Suspense fallback={<LoadingScreen />}><TerrainApp /></Suspense></MFARoute></ProtectedRoute>} />
        <Route path="/app/*"        element={<ProtectedRoute><MFARoute><SuperadminToAdminRedirect><Suspense fallback={<LoadingScreen />}><ContributorApp /></Suspense></SuperadminToAdminRedirect></MFARoute></ProtectedRoute>} />
        <Route path="/reader/*"     element={<ProtectedRoute><MFARoute><Suspense fallback={<LoadingScreen />}><ReaderApp /></Suspense></MFARoute></ProtectedRoute>} />
        <Route path="/manager/*"    element={<ProtectedRoute><MFARoute><Suspense fallback={<LoadingScreen />}><ManagerApp /></Suspense></MFARoute></ProtectedRoute>} />
        <Route path="/direction/*"  element={<ProtectedRoute><MFARoute><Suspense fallback={<LoadingScreen />}><DirectorApp /></Suspense></MFARoute></ProtectedRoute>} />
        <Route path="/admin/*"      element={<ProtectedRoute><MFARoute><Suspense fallback={<LoadingScreen />}><AdminApp /></Suspense></MFARoute></ProtectedRoute>} />
        <Route path="/superadmin/*" element={<ProtectedRoute><SuperadminGuard><MFARoute><Suspense fallback={<LoadingScreen />}><SuperAdminApp /></Suspense></MFARoute></SuperadminGuard></ProtectedRoute>} />

        {/* Catch-all */}
        <Route path="*" element={user ? <AppRedirect shell={appShell} /> : <Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

function AppRedirect({ shell }: { shell: ReturnType<typeof useAppShell> }) {
  const { role, profile } = useAuth()
  const routes: Record<NonNullable<typeof shell>, string> = {
    terrain:     '/terrain',
    contributor: '/app',
    reader:      '/reader',
    manager:     '/manager',
    director:    '/direction',
    admin:       '/admin',
    superadmin:  '/superadmin',
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
          href={`mailto:${SUPPORT_EMAIL}`}
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

function ConnectionErrorScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Erreur de connexion</h1>
        <p className="text-slate-500 text-sm mb-6">
          Impossible de charger vos données.<br />
          Vérifiez votre connexion et réessayez.
        </p>
        <button onClick={() => window.location.reload()} className="btn-primary inline-block mb-3 w-full">
          Réessayer
        </button>
        <button
          onClick={() => void signOut()}
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
