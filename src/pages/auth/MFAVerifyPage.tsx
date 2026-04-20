import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMFA, getUserMFAEnrollment } from '@/hooks/useMFA'
import OTPInput from '@/components/auth/OTPInput'

export default function MFAVerifyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, mfaVerified } = useAuth()
  const mfa = useMFA(user?.id)

  const [code, setCode] = useState('')
  const [factorId, setFactorId] = useState<string | undefined>()
  const [method, setMethod] = useState<'totp' | 'email_otp' | null>(null)
  const [resent, setResent] = useState(false)

  // Si déjà vérifié → redirection
  useEffect(() => {
    if (mfaVerified) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/app'
      navigate(from, { replace: true })
    }
  }, [mfaVerified, navigate, location.state])

  // Charge la méthode enrollée
  useEffect(() => {
    if (!user) return
    getUserMFAEnrollment(user.id).then((enrollment) => {
      if (!enrollment) return
      setMethod(enrollment.method)
      if (enrollment.method === 'totp' && enrollment.totp_factor_id) {
        setFactorId(enrollment.totp_factor_id)
      } else if (enrollment.method === 'email_otp') {
        // Envoie le code automatiquement à l'arrivée
        mfa.sendEmailOTPCode()
      }
    })
  }, [user?.id])

  async function handleVerify() {
    const ok = await mfa.verify(code, factorId)
    if (ok) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/app'
      navigate(from, { replace: true })
    }
  }

  async function handleResend() {
    await mfa.sendEmailOTPCode()
    setCode('')
    setResent(true)
    setTimeout(() => setResent(false), 30_000)
  }

  // Auto-submit quand 6 chiffres saisis
  useEffect(() => {
    if (code.length === 6) handleVerify()
  }, [code])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-sm"
      >
        {/* Icône */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center">
            <Shield className="w-8 h-8 text-brand-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
          Vérification
        </h1>
        <p className="text-slate-500 text-center text-sm mb-8">
          {method === 'totp'
            ? 'Saisissez le code affiché dans votre application Authenticator.'
            : 'Saisissez le code à 6 chiffres envoyé à votre adresse email.'}
        </p>

        {mfa.error && (
          <motion.div
            initial={{ x: -4, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-danger-light text-danger text-sm rounded-lg px-4 py-3 mb-6 text-center"
          >
            {mfa.error}
          </motion.div>
        )}

        <OTPInput
          value={code}
          onChange={setCode}
          autoFocus
          className="mb-8"
        />

        <button
          onClick={handleVerify}
          disabled={code.length < 6 || mfa.loading}
          className="btn-primary w-full py-3 text-base"
        >
          {mfa.loading ? (
            <span className="flex items-center gap-2 justify-center">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Vérification...
            </span>
          ) : (
            'Vérifier'
          )}
        </button>

        {method === 'email_otp' && (
          <button
            onClick={handleResend}
            disabled={resent || mfa.loading}
            className="w-full flex items-center justify-center gap-2 text-sm text-brand-600 hover:underline py-3 mt-1 disabled:text-slate-300 disabled:no-underline"
          >
            <RefreshCw className="w-3 h-3" />
            {resent ? 'Code renvoyé ✓' : 'Renvoyer le code'}
          </button>
        )}

        <p className="text-center text-xs text-slate-400 mt-6">
          Problème de connexion ?{' '}
          <a href="mailto:support@pilotos.fr" className="hover:text-slate-600 underline">
            Contacter le support
          </a>
        </p>
      </motion.div>
    </div>
  )
}
