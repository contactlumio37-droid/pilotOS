import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Settings, Shield, Bell, CreditCard, Save, Sparkles, Users } from 'lucide-react'
import { useOrganisation } from '@/hooks/useOrganisation'
import { supabase } from '@/lib/supabase'
import type { MfaPolicy, Organisation } from '@/types/database'

const orgSchema = z.object({
  name:   z.string().min(1, 'Nom requis'),
  slug:   z.string().min(2).regex(/^[a-z0-9-]+$/, 'Minuscules, chiffres et tirets uniquement'),
  plan:   z.string(),
})
type OrgForm = z.infer<typeof orgSchema>

const MFA_LABELS: Record<MfaPolicy, string> = {
  disabled:   'Désactivé',
  optional:   'Optionnel',
  required:   'Obligatoire pour tous',
  role_based: 'Par rôle',
}

const PLAN_LABELS: Record<string, string> = {
  free:       'Gratuit',
  team:       'Team',
  business:   'Business',
  pro:        'Pro',
  enterprise: 'Enterprise',
}

function useUpdateOrganisation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Organisation> & { id: string }) => {
      const { data, error } = await supabase
        .from('organisations')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Organisation
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organisation'] })
    },
  })
}

export default function AdminSettings() {
  const { organisation } = useOrganisation()
  const updateOrg = useUpdateOrganisation()
  const [saved, setSaved] = useState(false)
  const [mfaPolicy, setMfaPolicy] = useState<MfaPolicy>('optional')

  const { data: billing } = useQuery({
    queryKey: ['billing', organisation?.id],
    enabled: !!organisation,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_billing_status', { p_org_id: organisation!.id })
      if (error) throw error
      return data?.[0] as { used: number; seat_limit: number; has_capacity: boolean } | undefined
    },
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<OrgForm>({
    resolver: zodResolver(orgSchema),
    defaultValues: { name: '', slug: '', plan: 'free' },
  })

  useEffect(() => {
    if (organisation) {
      reset({ name: organisation.name, slug: organisation.slug, plan: organisation.plan })
      setMfaPolicy(organisation.mfa_policy)
    }
  }, [organisation, reset])

  async function onSubmit(data: OrgForm) {
    if (!organisation) return
    try {
      await updateOrg.mutateAsync({ id: organisation.id, name: data.name, slug: data.slug })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { /* handled by mutation */ }
  }

  async function saveMfa() {
    if (!organisation) return
    try {
      await updateOrg.mutateAsync({ id: organisation.id, mfa_policy: mfaPolicy })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { /* handled by mutation */ }
  }

  return (
    <div className="max-w-3xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>

        {/* Organisation */}
        <div className="card">
          <div className="flex items-center gap-3 mb-5">
            <Settings className="w-5 h-5 text-brand-600" />
            <h2 className="font-semibold text-slate-900">Organisation</h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Nom de l'organisation *</label>
              <input {...register('name')} className="input" placeholder="Mon entreprise" />
              {errors.name && <p className="text-xs text-danger-500 mt-1">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Identifiant URL (slug)</label>
                <input {...register('slug')} className="input font-mono" placeholder="mon-entreprise" />
                {errors.slug && <p className="text-xs text-danger-500 mt-1">{errors.slug.message}</p>}
              </div>
              <div>
                <label className="label">Plan</label>
                <input
                  {...register('plan')}
                  className="input bg-slate-50 cursor-not-allowed"
                  readOnly
                  value={PLAN_LABELS[organisation?.plan ?? 'free']}
                />
                <p className="text-xs text-slate-400 mt-1">Contactez le support pour changer de plan.</p>
              </div>
            </div>

            {updateOrg.isError && (
              <p className="text-sm text-danger-500">Erreur lors de la mise à jour.</p>
            )}

            <div className="flex items-center gap-3">
              <button type="submit" disabled={updateOrg.isPending} className="btn-primary flex items-center gap-1.5">
                <Save className="w-4 h-4" />
                {updateOrg.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              {saved && <span className="text-sm text-success-600 font-medium">Sauvegardé ✓</span>}
            </div>
          </form>
        </div>

        {/* Security / MFA */}
        <div className="card">
          <div className="flex items-center gap-3 mb-5">
            <Shield className="w-5 h-5 text-brand-600" />
            <h2 className="font-semibold text-slate-900">Sécurité & MFA</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Politique MFA</label>
              <select
                value={mfaPolicy}
                onChange={e => setMfaPolicy(e.target.value as MfaPolicy)}
                className="input"
              >
                {(Object.keys(MFA_LABELS) as MfaPolicy[]).map(k => (
                  <option key={k} value={k}>{MFA_LABELS[k]}</option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
              {mfaPolicy === 'disabled' && 'Le MFA n\'est pas proposé aux utilisateurs.'}
              {mfaPolicy === 'optional' && 'Les utilisateurs peuvent activer le MFA librement.'}
              {mfaPolicy === 'required' && 'Tous les utilisateurs doivent configurer le MFA à la connexion.'}
              {mfaPolicy === 'role_based' && 'Le MFA est requis pour les rôles manager, director et admin.'}
            </div>

            <button onClick={saveMfa} disabled={updateOrg.isPending} className="btn-primary flex items-center gap-1.5">
              <Save className="w-4 h-4" />
              Appliquer
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-brand-600" />
            <h2 className="font-semibold text-slate-900">Notifications</h2>
            <span className="badge badge-neutral text-xs">Bientôt disponible</span>
          </div>
          <div className="space-y-3 text-sm text-slate-400">
            {[
              'Actions en retard (rappel quotidien)',
              'Nouveaux signalements terrain',
              'Revues de processus à venir (J-7)',
              'Résumé hebdomadaire par email',
            ].map(label => (
              <label key={label} className="flex items-center gap-3 cursor-not-allowed">
                <input
                  type="checkbox"
                  disabled
                  className="rounded border-slate-200 text-slate-300 focus:ring-0"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4">
            La configuration des notifications par membre sera disponible dans une prochaine version.
          </p>
        </div>

        {/* Billing */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-brand-600" />
            <h2 className="font-semibold text-slate-900">Abonnement & Facturation</h2>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-slate-900">
                Plan {PLAN_LABELS[organisation?.plan ?? 'free']}
              </p>
              <p className="text-sm text-slate-500">
                {organisation?.seats_included ?? 0} sièges inclus
                {(organisation?.seats_extra ?? 0) > 0 && ` + ${organisation!.seats_extra} extra`}
              </p>
            </div>
            <a
              href="mailto:contact@pilotos.app"
              className="btn-secondary text-sm"
            >
              Contacter le support
            </a>
          </div>
          {billing && (
            <div className="mt-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${billing.has_capacity ? 'bg-brand-500' : 'bg-danger'}`}
                  style={{ width: `${Math.min(100, Math.round((billing.used / billing.seat_limit) * 100))}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 shrink-0">
                {billing.used} / {billing.seat_limit} sièges facturés
              </span>
            </div>
          )}
          {organisation?.stripe_customer_id && (
            <p className="text-xs text-slate-400 mt-2">
              Client Stripe : {organisation.stripe_customer_id}
            </p>
          )}
        </div>

        {/* IA */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-5 h-5 text-brand-600" />
            <h2 className="font-semibold text-slate-900">Intelligence Artificielle</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-700 font-medium">Assistance IA (rédaction d'actions)</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Coût facturé selon l'usage (API Anthropic). Désactivé par défaut.
              </p>
            </div>
            <button
              onClick={() => organisation && updateOrg.mutate({ id: organisation.id, ai_enabled: !organisation.ai_enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                organisation?.ai_enabled ? 'bg-brand-600' : 'bg-slate-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                organisation?.ai_enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          {organisation?.ai_enabled && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-3">
              IA activée — chaque requête consomme des tokens Anthropic (voir votre quota plan).
            </p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
