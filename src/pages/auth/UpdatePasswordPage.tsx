import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { updatePassword } from '@/hooks/useAuth'

const schema = z.object({
  password: z
    .string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[0-9]/, 'Au moins un chiffre'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm'],
})

type FormData = z.infer<typeof schema>

export default function UpdatePasswordPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setError(null)
    const { error: authError } = await updatePassword(data.password)
    if (authError) {
      setError('Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré.')
      return
    }
    navigate('/login', { state: { passwordUpdated: true } })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-sm"
      >
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center">
            <Lock className="w-7 h-7 text-brand-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
          Nouveau mot de passe
        </h1>
        <p className="text-slate-500 text-center mb-8">
          Choisissez un mot de passe solide pour sécuriser votre compte.
        </p>

        {error && (
          <div className="bg-danger-light text-danger text-sm rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Nouveau mot de passe</label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                className="input pr-10"
                placeholder="Minimum 8 caractères"
                autoComplete="new-password"
                autoFocus
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

          <div>
            <label className="label">Confirmer le mot de passe</label>
            <input
              {...register('confirm')}
              type={showPassword ? 'text' : 'password'}
              className="input"
              placeholder="Répétez le mot de passe"
              autoComplete="new-password"
            />
            {errors.confirm && (
              <p className="text-xs text-danger mt-1">{errors.confirm.message}</p>
            )}
          </div>

          {/* Indicateurs de force */}
          <ul className="text-xs text-slate-400 space-y-1 pl-1">
            <li>8 caractères minimum</li>
            <li>Au moins une majuscule</li>
            <li>Au moins un chiffre</li>
          </ul>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
            {isSubmitting ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
