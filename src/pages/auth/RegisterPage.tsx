import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { signUpWithEmail } from '@/hooks/useAuth'

const schema = z.object({
  full_name: z.string().min(2, 'Prénom et nom requis'),
  email: z.string().email('Email invalide'),
  password: z
    .string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[0-9]/, 'Au moins un chiffre'),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setError(null)
    const { error: authError } = await signUpWithEmail(data.email, data.password, data.full_name)
    if (authError) {
      setError(authError.message)
      return
    }
    setEmailSent(true)
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-sm"
        >
          <div className="text-5xl mb-4">📧</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Vérifiez votre email</h1>
          <p className="text-slate-500">
            Un lien de confirmation vous a été envoyé. Cliquez dessus pour activer votre compte.
          </p>
          <Link to="/login" className="btn-primary inline-flex mt-6">
            Retour à la connexion
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-sm"
      >
        <div className="text-2xl font-display font-bold text-slate-900 mb-8">PilotOS</div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">Créer un compte</h1>
        <p className="text-slate-500 mb-8">
          Déjà inscrit ?{' '}
          <Link to="/login" className="text-brand-600 font-medium hover:underline">
            Se connecter
          </Link>
        </p>

        {error && (
          <div className="bg-danger-light text-danger text-sm rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Prénom et nom</label>
            <input
              {...register('full_name')}
              className="input"
              placeholder="Marie Dupont"
              autoComplete="name"
            />
            {errors.full_name && (
              <p className="text-xs text-danger mt-1">{errors.full_name.message}</p>
            )}
          </div>

          <div>
            <label className="label">Email professionnel</label>
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
            <input
              {...register('password')}
              type="password"
              className="input"
              placeholder="Minimum 8 caractères"
              autoComplete="new-password"
            />
            {errors.password && (
              <p className="text-xs text-danger mt-1">{errors.password.message}</p>
            )}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
            {isSubmitting ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          En créant un compte vous acceptez les{' '}
          <a href="/cgu" className="hover:text-slate-600 underline">CGU</a>.
        </p>
      </motion.div>
    </div>
  )
}
