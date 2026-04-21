import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { signInWithEmail, signInWithGoogle } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { isMFARequired } from '@/hooks/useMFA'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname
  const passwordUpdated = (location.state as { passwordUpdated?: boolean })?.passwordUpdated

  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setError(null)
    const { data: authData, error: authError } = await signInWithEmail(data.email, data.password)
    if (authError || !authData.user) {
      setError('Email ou mot de passe incorrect.')
      return
    }

    const userId = authData.user.id

    // Vérifie si MFA est requis pour cet utilisateur
    const memberResult = await supabase
      .from('organisation_members')
      .select('role, mfa_enabled, organisation:organisations(mfa_policy)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (memberResult.data) {
      const { role, mfa_enabled, organisation } = memberResult.data
      const policy = (organisation as unknown as { mfa_policy: string } | null)?.mfa_policy ?? 'optional'

      if (isMFARequired(policy, role, mfa_enabled)) {
        navigate('/mfa/verify', { state: { from: { pathname: from ?? '/app' } }, replace: true })
        return
      }
    }

    // Pas de MFA requis → redirection directe
    navigate(from ?? '/app', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Panneau gauche branding — desktop uniquement */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col items-center justify-center p-12">
        <div className="max-w-md w-full">
          <div className="text-4xl font-display font-black text-white mb-8">PilotOS</div>
          <blockquote className="text-xl text-slate-300 leading-relaxed">
            "Un problème signalé sur le terrain devient une action dans le tableau de bord du manager — en 30 secondes."
          </blockquote>
          <div className="flex flex-col gap-3 mt-10">
            {[
              'Pilotage stratégique relié au terrain',
              'Processus ISO 9001 sans effort',
              'GED maîtrisée, zéro chaos documentaire',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
                <span className="text-slate-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-sm"
        >
          <div className="text-2xl font-display font-bold text-slate-900 mb-8 lg:hidden">
            PilotOS
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">Connexion</h1>
          <p className="text-slate-500 mb-8">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-brand-600 font-medium hover:underline">
              S'inscrire gratuitement
            </Link>
          </p>

          {passwordUpdated && (
            <div className="bg-success-light text-success text-sm rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Mot de passe mis à jour. Connectez-vous.
            </div>
          )}

          {error && (
            <div className="bg-danger-light text-danger text-sm rounded-lg px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => signInWithGoogle()}
            className="w-full flex items-center justify-center gap-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium py-2.5 px-4 rounded-xl transition-colors mb-6"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">ou</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                {...register('email')}
                type="email"
                className="input"
                placeholder="vous@entreprise.fr"
                autoComplete="email"
                autoFocus
              />
              {errors.email && (
                <p className="text-xs text-danger mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Mot de passe</label>
                <Link
                  to="/reset-password"
                  className="text-xs text-brand-600 hover:underline"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-danger mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3 text-base"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Connexion...
                </span>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            <Link to="/" className="hover:text-slate-600">← Retour au site</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
