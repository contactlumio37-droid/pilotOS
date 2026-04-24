import { useState, useEffect, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, Organisation, UserRole } from '@/types/database'

// ── Clés storage ─────────────────────────────────────────────
const MFA_VERIFIED_KEY    = 'pilotos_mfa_verified'
export const ADMIN_SESSION_KEY = 'pilotos_admin_session'

// ── JWT decoder (pas de dépendance externe) ──────────────────
function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(b64))
  } catch { return null }
}

// ── Types ─────────────────────────────────────────────────────

export interface AuthState {
  user:                    User | null
  session:                 Session | null
  profile:                 Profile | null
  organisation:            Organisation | null
  role:                    UserRole | null
  mfaVerified:             boolean
  isImpersonating:         boolean
  impersonatorId:          string | null
  impersonatorEmail:       string | null
  impersonationExpiresAt:  Date | null
  loading:                 boolean
}

// ── Hook ─────────────────────────────────────────────────────

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null, session: null, profile: null, organisation: null, role: null,
    mfaVerified: false, isImpersonating: false, impersonatorId: null,
    impersonatorEmail: null, impersonationExpiresAt: null, loading: true,
  })

  const loadUserData = useCallback(async (user: User | null, session: Session | null) => {
    if (!user) {
      setState({
        user: null, session: null, profile: null, organisation: null, role: null,
        mfaVerified: false, isImpersonating: false, impersonatorId: null,
        impersonatorEmail: null, impersonationExpiresAt: null, loading: false,
      })
      return
    }

    const mfaVerified = sessionStorage.getItem(MFA_VERIFIED_KEY) === user.id

    // Détecter l'impersonation depuis les claims JWT
    const claims = session ? decodeJwt(session.access_token) : null
    const isImpersonating    = claims?.is_impersonating === true
    const impersonatorId     = (claims?.impersonator_id as string) ?? null
    const impersonatorEmail  = (claims?.impersonator_email as string) ?? null
    const expClaim           = claims?.exp as number | undefined
    const impersonationExpiresAt = expClaim ? new Date(expClaim * 1000) : null

    // Handle multiple memberships (superadmin can belong to several orgs)
    const ctxOrgId = sessionStorage.getItem('pilotos_org_ctx')
    let memberQ = supabase
      .from('organisation_members')
      .select('role, organisation:organisations(*)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
    if (ctxOrgId) memberQ = memberQ.eq('organisation_id', ctxOrgId)

    const [profileResult, memberResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      memberQ.limit(1),
    ])

    const profile     = profileResult.data as Profile | null
    const memberRows  = memberResult.data as { role: string; organisation: Organisation | Organisation[] }[] | null
    const memberRow   = memberRows?.[0]
    const rawOrg      = memberRow?.organisation
    const organisation = rawOrg ? (Array.isArray(rawOrg) ? rawOrg[0] : rawOrg) as Organisation : null
    const role        = (memberRow?.role ?? null) as UserRole | null

    setState({
      user, session, profile, organisation, role, mfaVerified,
      isImpersonating, impersonatorId, impersonatorEmail, impersonationExpiresAt,
      loading: false,
    })
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUserData(session?.user ?? null, session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (_event === 'SIGNED_OUT') {
          sessionStorage.removeItem(MFA_VERIFIED_KEY)
        }
        loadUserData(session?.user ?? null, session)
      },
    )

    return () => subscription.unsubscribe()
  }, [loadUserData])

  return state
}

// ── Impersonation ─────────────────────────────────────────────

export async function startImpersonation(
  targetUserId: string,
  organisationId: string,
  reason?: string,
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Aucune session active')

  // Sauvegarder la session admin
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
    access_token:  session.access_token,
    refresh_token: session.refresh_token,
  }))

  // Appeler l'Edge Function
  const { data, error } = await supabase.functions.invoke('impersonate-user', {
    body: { target_user_id: targetUserId, organisation_id: organisationId, reason },
  })

  if (error || data?.error) {
    localStorage.removeItem(ADMIN_SESSION_KEY)
    throw new Error(data?.error ?? error?.message ?? 'Impersonation échouée')
  }

  // Swapper la session
  await supabase.auth.setSession({ access_token: data.token, refresh_token: '' })
  // Forcer un rechargement complet pour que le routing se réinitialise
  window.location.href = '/app'
}

export async function stopImpersonation(): Promise<void> {
  const backup = localStorage.getItem(ADMIN_SESSION_KEY)
  localStorage.removeItem(ADMIN_SESSION_KEY)

  if (backup) {
    const { access_token, refresh_token } = JSON.parse(backup) as {
      access_token: string
      refresh_token: string
    }
    await supabase.auth.setSession({ access_token, refresh_token })
  } else {
    await supabase.auth.signOut()
  }
  window.location.href = '/superadmin'
}

// ── Auth helpers ──────────────────────────────────────────────

export function setMfaVerified(userId: string): void {
  sessionStorage.setItem(MFA_VERIFIED_KEY, userId)
}

export function clearMfaVerified(): void {
  sessionStorage.removeItem(MFA_VERIFIED_KEY)
}

export async function signOut(): Promise<void> {
  clearMfaVerified()
  await supabase.auth.signOut()
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/app` },
  })
}

export async function sendPasswordResetEmail(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/update-password`,
  })
}

export async function updatePassword(newPassword: string) {
  return supabase.auth.updateUser({ password: newPassword })
}
