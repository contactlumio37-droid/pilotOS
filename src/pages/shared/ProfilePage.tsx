import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Save, Lock, User, Flame } from 'lucide-react'
import { useProfile, useUpdateProfile, useChangePassword } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/useToast'
import { useGamification } from '@/hooks/useGamification'
import { UserStreak } from '@/components/features/gamification/UserStreak'
import { BadgeList } from '@/components/features/gamification/UserBadge'

const profileSchema = z.object({
  full_name: z.string().min(1, 'Nom requis'),
  phone:     z.string().nullable().optional(),
  job_title: z.string().nullable().optional(),
})
type ProfileForm = z.infer<typeof profileSchema>

const passwordSchema = z.object({
  password:        z.string().min(8, '8 caractères minimum'),
  passwordConfirm: z.string(),
}).refine(d => d.password === d.passwordConfirm, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['passwordConfirm'],
})
type PasswordForm = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const { user, isImpersonating } = useAuth()
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const { streak, badges } = useGamification()
  const toast = useToast()

  const {
    register: regProfile,
    handleSubmit: hsProfile,
    reset: resetProfile,
    formState: { errors: errProfile },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: '', phone: null, job_title: null },
  })

  const {
    register: regPwd,
    handleSubmit: hsPwd,
    reset: resetPwd,
    formState: { errors: errPwd },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  useEffect(() => {
    if (profile) {
      resetProfile({
        full_name: profile.full_name ?? '',
        phone:     profile.phone ?? null,
        job_title: profile.job_title ?? null,
      })
    }
  }, [profile, resetProfile])

  async function onProfileSubmit(data: ProfileForm) {
    try {
      await updateProfile.mutateAsync({
        full_name: data.full_name,
        phone:     data.phone ?? null,
        job_title: data.job_title ?? null,
      })
      toast.success('Profil mis à jour ✓')
    } catch (err) {
      toast.error(`Erreur profil : ${(err as Error).message}`)
    }
  }

  async function onPasswordSubmit(data: PasswordForm) {
    try {
      await changePassword.mutateAsync(data.password)
      resetPwd()
      toast.success('Mot de passe modifié ✓')
    } catch (err) {
      toast.error(`Erreur : ${(err as Error).message}`)
    }
  }

  const initials = (profile?.full_name ?? user?.email ?? '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="max-w-2xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Mon profil</h1>

        {/* Avatar + email */}
        <div className="card flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-2xl object-cover" />
            ) : (
              <span className="text-white text-xl font-bold">{initials}</span>
            )}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{profile?.full_name ?? '—'}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>

        {/* Gamification */}
        <div className="card space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-5 h-5 text-orange-500" />
            <h2 className="font-semibold text-slate-900">Activité & badges</h2>
          </div>
          <UserStreak streak={streak} />
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-3">Badges obtenus</p>
            <BadgeList badges={badges} emptyMessage="Continuez à utiliser PilotOS pour débloquer vos premiers badges !" />
          </div>
        </div>

        {/* Profile form */}
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <User className="w-5 h-5 text-brand-600" />
            <h2 className="font-semibold text-slate-900">Informations personnelles</h2>
          </div>

          <form onSubmit={hsProfile(onProfileSubmit)} className="space-y-4">
            <div>
              <label className="label">Nom complet *</label>
              <input {...regProfile('full_name')} className="input" placeholder="Jean Dupont" />
              {errProfile.full_name && <p className="text-xs text-danger-500 mt-1">{errProfile.full_name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Téléphone</label>
                <input {...regProfile('phone')} className="input" placeholder="+33 6 12 34 56 78" />
              </div>
              <div>
                <label className="label">Fonction</label>
                <input {...regProfile('job_title')} className="input" placeholder="Responsable qualité" />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={updateProfile.isPending}
                className="btn-primary flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                {updateProfile.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>

        {/* Password form — désactivé en mode impersonation */}
        <div className={`card ${isImpersonating ? 'opacity-50 pointer-events-none select-none' : ''}`}>
          <div className="flex items-center gap-2 mb-5">
            <Lock className="w-5 h-5 text-brand-600" />
            <h2 className="font-semibold text-slate-900">Changer le mot de passe</h2>
            {isImpersonating && (
              <span className="ml-auto text-xs text-amber-600 font-medium">Désactivé en mode impersonation</span>
            )}
          </div>

          <form onSubmit={hsPwd(onPasswordSubmit)} className="space-y-4">
            <div>
              <label className="label">Nouveau mot de passe</label>
              <input
                {...regPwd('password')}
                type="password"
                className="input"
                placeholder="8 caractères minimum"
                autoComplete="new-password"
              />
              {errPwd.password && <p className="text-xs text-danger-500 mt-1">{errPwd.password.message}</p>}
            </div>
            <div>
              <label className="label">Confirmer le mot de passe</label>
              <input
                {...regPwd('passwordConfirm')}
                type="password"
                className="input"
                placeholder="Répétez le mot de passe"
                autoComplete="new-password"
              />
              {errPwd.passwordConfirm && (
                <p className="text-xs text-danger-500 mt-1">{errPwd.passwordConfirm.message}</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={changePassword.isPending}
                className="btn-primary flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4" />
                {changePassword.isPending ? 'Modification…' : 'Modifier le mot de passe'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
