import { useState, useEffect, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, Organisation, UserRole } from '@/types/database'

// Clé sessionStorage — effacé à la fermeture du navigateur
const MFA_VERIFIED_KEY = 'pilotos_mfa_verified'

export interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  organisation: Organisation | null
  role: UserRole | null
  mfaVerified: boolean
  loading: boolean
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    organisation: null,
    role: null,
    mfaVerified: false,
    loading: true,
  })

  const loadUserData = useCallback(async (user: User | null, session: Session | null) => {
    if (!user) {
      setState({ user: null, session: null, profile: null, organisation: null, role: null, mfaVerified: false, loading: false })
      return
    }

    const mfaVerified = sessionStorage.getItem(MFA_VERIFIED_KEY) === user.id

    // Fetch profile + membership en parallèle
    const [profileResult, memberResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('organisation_members')
        .select('role, organisation:organisations(*)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single(),
    ])

    const profile = profileResult.data as Profile | null
    const member = memberResult.data
    const rawOrg = member?.organisation
    const organisation = (Array.isArray(rawOrg) ? rawOrg[0] : rawOrg) as Organisation | null
    const role = member?.role as UserRole | null

    setState({ user, session, profile, organisation, role, mfaVerified, loading: false })
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

// ============================================================
// Helpers exportés
// ============================================================

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

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string,
) {
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
