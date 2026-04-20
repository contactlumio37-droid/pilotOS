import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { signInWithEmail } from '@/hooks/useAuth'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe requis'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setError(null)
    const { error: authError } = await signInWithEmail(data.email, data.password)
    if (authError) {
      setError('Email ou mot de passe incorrect.')
      return
    }
    navigate('/app')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Panneau gauche (branding) — desktop only */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <div className="text-4xl font-display font-black mb-6">PilotOS</div>
          <blockquote className="text-xl text-slate-300 leading-relaxed">
            "Une décision prise en CODIR devient une action assignée, suivie, mesurée — sans réunion de suivi."
          </blockquote>
        </div>
      </div>

      {/* Formulaire */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-sm"
        >
          <div className="text-2xl font-display font-bold text-slate-900 mb-8 lg:hidden">PilotOS</div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">Connexion</h1>
          <p className="text-slate-500 mb-8">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-brand-600 font-medium hover:underline">
              S'inscrire
            </Link>
          </p>

          {error && (
            <div className="bg-danger-light text-danger text-sm rounded-lg px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                {...register('email')}
                type="email"
                className="input"
                placeholder="vous@entreprise.fr"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-xs text-danger mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="label">Mot de passe</label>
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

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
              {isSubmitting ? 'Connexion...' : 'Se connecter'}
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
