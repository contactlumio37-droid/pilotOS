import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { setMfaVerified } from './useAuth'
import type { MfaEnrollment } from '@/types/database'

export interface TOTPSetupData {
  factorId: string
  uri: string
  secret: string
  qrSvg?: string
}

export interface MFAHook {
  // État
  loading: boolean
  error: string | null
  // Setup TOTP : renvoie les données QR
  setupTOTP: () => Promise<TOTPSetupData>
  // Confirme enrollment TOTP après que l'user a saisi le premier code
  confirmTOTPEnrollment: (factorId: string, code: string) => Promise<void>
  // Setup Email OTP : envoie un code (pas besoin de données à afficher)
  setupEmailOTP: () => Promise<void>
  // Vérifie un code (TOTP ou Email OTP selon méthode enrollée)
  verify: (code: string, factorId?: string) => Promise<boolean>
  // Envoie un nouveau code Email OTP (pour la page verify)
  sendEmailOTPCode: () => Promise<void>
  // Annule / ré-initialise les erreurs
  clearError: () => void
}

export function useMFA(userId?: string | null): MFAHook {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  // ── TOTP Setup ──────────────────────────────────────────
  const setupTOTP = useCallback(async (): Promise<TOTPSetupData> => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'PilotOS Authenticator',
      })
      if (enrollError || !data) throw enrollError ?? new Error('Échec enrollment TOTP')

      return {
        factorId: data.id,
        uri: data.totp.uri,
        secret: data.totp.secret,
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur TOTP setup'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Confirme TOTP enrollment ─────────────────────────────
  const confirmTOTPEnrollment = useCallback(async (factorId: string, code: string): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      // Crée un challenge puis vérifie
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
      if (challengeError || !challenge) throw challengeError ?? new Error('Challenge TOTP échoué')

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.replace(/\s/g, ''),
      })
      if (verifyError) throw verifyError

      // Enregistre l'enrollment dans notre table
      if (userId) {
        await supabase.from('mfa_enrollments').upsert({
          user_id: userId,
          method: 'totp',
          totp_factor_id: factorId,
          is_active: true,
          enrolled_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

        // Marque mfa_enabled dans organisation_members
        await supabase
          .from('organisation_members')
          .update({ mfa_enabled: true, mfa_enrolled_at: new Date().toISOString() })
          .eq('user_id', userId)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Code incorrect ou expiré'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [userId])

  // ── Email OTP Setup ──────────────────────────────────────
  const setupEmailOTP = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      // Délègue la génération + envoi à l'Edge Function
      const { error: fnError } = await supabase.functions.invoke('mfa-send-email-otp', {
        body: { purpose: 'setup' },
      })
      if (fnError) throw fnError

      if (userId) {
        await supabase.from('mfa_enrollments').upsert({
          user_id: userId,
          method: 'email_otp',
          is_active: false, // devient true après vérification
        }, { onConflict: 'user_id' })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur envoi Email OTP'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [userId])

  // ── Envoie code Email OTP (login) ────────────────────────
  const sendEmailOTPCode = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const { error: fnError } = await supabase.functions.invoke('mfa-send-email-otp', {
        body: { purpose: 'verify' },
      })
      if (fnError) throw fnError
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur envoi code'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Vérification (TOTP ou Email OTP) ────────────────────
  const verify = useCallback(async (code: string, factorId?: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const cleanCode = code.replace(/\s/g, '')

      if (factorId) {
        // Vérification TOTP via Supabase native MFA
        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
        if (challengeError || !challenge) throw challengeError ?? new Error('Challenge échoué')

        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId,
          challengeId: challenge.id,
          code: cleanCode,
        })
        if (verifyError) {
          setError('Code incorrect. Vérifiez votre application d\'authentification.')
          return false
        }
      } else {
        // Vérification Email OTP via Edge Function
        const { data, error: fnError } = await supabase.functions.invoke('mfa-verify-email-otp', {
          body: { code: cleanCode },
        })
        if (fnError || !data?.verified) {
          setError('Code incorrect ou expiré.')
          return false
        }
      }

      // Marque MFA vérifié pour cette session
      if (userId) {
        setMfaVerified(userId)
      }
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur vérification'
      setError(msg)
      return false
    } finally {
      setLoading(false)
    }
  }, [userId])

  return {
    loading,
    error,
    setupTOTP,
    confirmTOTPEnrollment,
    setupEmailOTP,
    sendEmailOTPCode,
    verify,
    clearError,
  }
}

// ── Helper : récupérer l'enrollment de l'utilisateur ────────
export async function getUserMFAEnrollment(userId: string): Promise<MfaEnrollment | null> {
  const { data } = await supabase
    .from('mfa_enrollments')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()
  return data as MfaEnrollment | null
}

// ── Helper : MFA requis ? (selon policy org + rôle) ─────────
export function isMFARequired(
  policy: string,
  role: string,
  mfaEnabled: boolean,
): boolean {
  if (policy === 'disabled') return false
  if (policy === 'required') return true
  if (policy === 'role_based') {
    return ['admin', 'manager', 'director'].includes(role)
  }
  // 'optional' → requis seulement si déjà enrollé
  return mfaEnabled
}
