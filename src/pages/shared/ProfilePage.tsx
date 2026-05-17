import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Save, Lock, User, Flame, MessageSquarePlus, Bell, Shield, CheckCircle2 } from 'lucide-react'
import { Link, useResolvedPath } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useProfile, useUpdateProfile, useChangePassword } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'
import { useOrganisation } from '@/hooks/useOrganisation'
import { useToast } from '@/components/ui/useToast'
import { useGamification } from '@/hooks/useGamification'
import { UserStreak } from '@/components/features/gamification/UserStreak'
import { BadgeList } from '@/components/features/gamification/UserBadge'
import { supabase } from '@/lib/supabase'

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

type NotifPrefs = {
  email_late_actions: boolean
  email_due_soon: boolean
  email_digest_weekly: boolean
  email_document_approval: boolean
}

const NOTIF_CONFIG: { key: keyof NotifPrefs; label: string; description: string }[] = [
  { key: 'email_late_actions',     label: "Rappels d'actions en retard",   description: "Email quotidien à 8h listant vos actions dont l'échéance est dépassée." },
  { key: 'email_due_soon',         label: 'Échéances proches (J-2)',        description: "Email 2 jours avant l'échéance de vos actions." },
  { key: 'email_digest_weekly',    label: 'Résumé hebdomadaire',            description: 'Bilan envoyé chaque lundi matin : actions en retard, terminées, signalements.' },
  { key: 'email_document_approval',label: 'Demandes de validation GED',    description: 'Notification quand un document passe en revue et nécessite votre validation.' },
]

export default function ProfilePage() {
  const { user, isImpersonating } = useAuth()
  const { data: profile } = useProfile()
  const { member } = useOrganisation()
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const { streak, badges } = useGamification()
  const toast = useToast()
  const qc = useQueryClient()
  const [savingNotif, setSavingNotif] = useState(false)

  const defaultPrefs: NotifPrefs = {
    email_late_actions: true,
    email_due_soon: true,
    email_digest_weekly: true,
    email_document_approval: true,
  }
  const prefs: NotifPrefs = member
    ? { ...defaultPrefs, ...(member.notification_prefs as Partial<NotifPrefs>) }
    : defaultPrefs

  async function toggleNotif(key: keyof NotifPrefs) {
    if (!member) return
    setSavingNotif(true)
    const next = { ...prefs, [key]: !prefs[key] }
    await supabase
      .from('organisation_members')
      .update({ notification_prefs: next })
      .eq('id', member.id)
    qc.invalidateQueries({ queryKey: ['organisation_member'] })
    setSavingNotif(false)
  }

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

  const { pathname } = useResolvedPath('.')
  const feedbackPath = pathname.replace(/\/profil$/, '/feedback')

  const initials = (profile?.full_name ?? user?.email ?? '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="max-w-2xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Mon profil</h1>
          <Link
            to={feedbackPath}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 transition-colors"
          >
            <MessageSquarePlus className="w-4 h-4" />
            Mes signalements
          </Link>
        </div>

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

        {/* MFA / Sécurité */}
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-5 h-5 text-brand-600" />
            <h2 className="font-semibold text-slate-900">Double authentification (MFA)</h2>
          </div>
          {member?.mfa_enabled ? (
            <div className="flex items-center gap-2 text-sm text-success-600">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>MFA activé — votre compte est protégé par une double authentification.</span>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-700">MFA non activé</p>
                <p className="text-xs text-slate-500 mt-0.5">Protégez votre compte avec un second facteur d'authentification (TOTP ou email).</p>
              </div>
              <Link to="/mfa/setup" className="btn-primary text-sm shrink-0">
                Activer le MFA
              </Link>
            </div>
          )}
        </div>

        {/* Notification preferences */}
        {member && (
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <Bell className="w-5 h-5 text-brand-600" />
              <h2 className="font-semibold text-slate-900">Notifications par email</h2>
              {savingNotif && <span className="text-xs text-slate-400 ml-auto">Enregistrement…</span>}
            </div>
            <div className="space-y-1">
              {NOTIF_CONFIG.map(({ key, label, description }) => (
                <div key={key} className="flex items-start justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                  </div>
                  <button
                    onClick={() => toggleNotif(key)}
                    disabled={savingNotif}
                    role="switch"
                    aria-checked={prefs[key]}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                      prefs[key] ? 'bg-brand-600' : 'bg-slate-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      prefs[key] ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
