import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Smartphone, Mail, ChevronRight, Check } from 'lucide-react'
import QRCode from 'qrcode'
import { useAuth } from '@/hooks/useAuth'
import { useMFA } from '@/hooks/useMFA'
import OTPInput from '@/components/auth/OTPInput'
import type { TOTPSetupData } from '@/hooks/useMFA'

type Step = 'choose' | 'totp-qr' | 'totp-confirm' | 'email-sent' | 'email-confirm' | 'done'

export default function MFASetupPage() {
  const navigate = useNavigate()
  const { user, role } = useAuth()
  const mfa = useMFA(user?.id)

  const [step, setStep] = useState<Step>('choose')
  const [totpData, setTotpData] = useState<TOTPSetupData | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [code, setCode] = useState('')
  const [showSecret, setShowSecret] = useState(false)

  // Génère le QR code SVG depuis l'URI TOTP
  useEffect(() => {
    if (totpData?.uri) {
      QRCode.toDataURL(totpData.uri, { width: 200, margin: 1 }).then(setQrDataUrl)
    }
  }, [totpData?.uri])

  // Admin/Manager → TOTP + Email OTP disponibles
  // Contributor/Terrain/Director → Email OTP seulement
  const canUseTOTP = ['admin', 'manager', 'director', 'superadmin'].includes(role ?? '')

  async function handleChooseTOTP() {
    const data = await mfa.setupTOTP()
    setTotpData(data)
    setStep('totp-qr')
  }

  async function handleChooseEmail() {
    await mfa.setupEmailOTP()
    setStep('email-sent')
  }

  async function handleConfirmTOTP() {
    if (!totpData) return
    await mfa.confirmTOTPEnrollment(totpData.factorId, code)
    setStep('done')
  }

  async function handleConfirmEmail() {
    const ok = await mfa.verify(code)
    if (ok) setStep('done')
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-full bg-success-light flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">MFA activé !</h1>
          <p className="text-slate-500 mb-6">
            Votre compte est maintenant protégé par une double authentification.
          </p>
          <button onClick={() => navigate('/app')} className="btn-primary">
            Accéder à mon espace
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
            <Shield className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Sécuriser mon compte</h1>
            <p className="text-sm text-slate-500">Double authentification (MFA)</p>
          </div>
        </div>

        {mfa.error && (
          <div className="bg-danger-light text-danger text-sm rounded-lg px-4 py-3 mb-6">
            {mfa.error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Étape 1 : Choix méthode */}
          {step === 'choose' && (
            <motion.div
              key="choose"
              initial={{ x: 16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -16, opacity: 0 }}
              className="space-y-3"
            >
              <p className="text-slate-600 mb-4">Choisissez votre méthode de vérification :</p>

              {canUseTOTP && (
                <button
                  onClick={handleChooseTOTP}
                  disabled={mfa.loading}
                  className="w-full p-4 rounded-xl border-2 border-slate-200 bg-white hover:border-brand-400 hover:bg-brand-50 transition-all text-left flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5 text-brand-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">Application Authenticator</p>
                    <p className="text-sm text-slate-500">Google Authenticator, Authy, etc.</p>
                    <p className="text-xs text-success font-medium mt-1">Recommandé — plus sécurisé</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              )}

              <button
                onClick={handleChooseEmail}
                disabled={mfa.loading}
                className="w-full p-4 rounded-xl border-2 border-slate-200 bg-white hover:border-brand-400 hover:bg-brand-50 transition-all text-left flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-slate-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">Code par email</p>
                  <p className="text-sm text-slate-500">Un code à 6 chiffres envoyé à chaque connexion</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => navigate('/app')}
                className="w-full text-center text-sm text-slate-400 hover:text-slate-600 py-2 mt-2 transition-colors"
              >
                Configurer plus tard
              </button>
            </motion.div>
          )}

          {/* Étape 2 TOTP : QR Code */}
          {step === 'totp-qr' && totpData && (
            <motion.div
              key="totp-qr"
              initial={{ x: 16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -16, opacity: 0 }}
            >
              <h2 className="font-bold text-slate-900 mb-2">Scannez ce QR code</h2>
              <p className="text-sm text-slate-500 mb-6">
                Ouvrez votre application Authenticator et scannez le code ci-dessous.
              </p>

              {qrDataUrl && (
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-white rounded-xl border border-slate-200">
                    <img src={qrDataUrl} alt="QR Code TOTP" className="w-48 h-48" />
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowSecret(!showSecret)}
                className="text-xs text-brand-600 hover:underline mb-4 block text-center w-full"
              >
                {showSecret ? 'Masquer' : 'Saisir le code manuellement'}
              </button>

              {showSecret && (
                <div className="bg-slate-50 rounded-lg p-3 mb-4 font-mono text-sm text-center tracking-widest text-slate-700 border border-slate-200">
                  {totpData.secret}
                </div>
              )}

              <button
                onClick={() => setStep('totp-confirm')}
                className="btn-primary w-full"
              >
                J'ai scanné le QR code
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Étape 3 TOTP : Confirmation */}
          {step === 'totp-confirm' && (
            <motion.div
              key="totp-confirm"
              initial={{ x: 16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -16, opacity: 0 }}
            >
              <h2 className="font-bold text-slate-900 mb-2">Vérification</h2>
              <p className="text-sm text-slate-500 mb-8">
                Saisissez le code affiché dans votre application Authenticator pour confirmer la configuration.
              </p>

              <OTPInput value={code} onChange={setCode} className="mb-8" />

              <button
                onClick={handleConfirmTOTP}
                disabled={code.length < 6 || mfa.loading}
                className="btn-primary w-full"
              >
                {mfa.loading ? 'Vérification...' : 'Confirmer'}
              </button>
            </motion.div>
          )}

          {/* Email OTP : code envoyé */}
          {step === 'email-sent' && (
            <motion.div
              key="email-sent"
              initial={{ x: 16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -16, opacity: 0 }}
            >
              <div className="text-center mb-8">
                <div className="text-4xl mb-3">📧</div>
                <h2 className="font-bold text-slate-900 mb-2">Code envoyé</h2>
                <p className="text-sm text-slate-500">
                  Un code à 6 chiffres a été envoyé à votre email. Il expire dans 10 minutes.
                </p>
              </div>

              <OTPInput value={code} onChange={setCode} className="mb-8" />

              <button
                onClick={handleConfirmEmail}
                disabled={code.length < 6 || mfa.loading}
                className="btn-primary w-full"
              >
                {mfa.loading ? 'Vérification...' : 'Confirmer'}
              </button>

              <button
                onClick={() => mfa.sendEmailOTPCode()}
                className="w-full text-center text-sm text-brand-600 hover:underline py-3 mt-2"
              >
                Renvoyer le code
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
