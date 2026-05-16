import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Settings, Shield, Bell, CreditCard, Save, Sparkles, Users,
  Boxes, Tag, ArrowRight, ExternalLink, CheckCircle2, Activity,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useOrganisation } from '@/hooks/useOrganisation'
import ActionCategories from '@/pages/admin/ActionCategories'
import CategoryManager from '@/components/admin/CategoryManager'
import HealthScoreSettings from '@/components/admin/HealthScoreSettings'
import { useActiveModules } from '@/hooks/useModuleAccess'
import { useStripeCheckout } from '@/hooks/useStripeCheckout'
import { supabase } from '@/lib/supabase'
import { PLANS } from '@/lib/stripe'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { MfaPolicy, Module, Organisation } from '@/types/database'

// ── Schema / Types ────────────────────────────────────────────

const orgSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Minuscules, chiffres et tirets uniquement'),
  plan: z.string(),
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

const MODULE_LABELS: Record<Module, string> = {
  pilotage:  'Pilotage',
  processus: 'Processus',
  ged:       'GED',
  terrain:   'Terrain',
  securite:  'Sécurité / QSE',
  qse:       'Qualité Sécurité Environnement',
}

// ── Tab IDs ───────────────────────────────────────────────────

type SettingsTab = 'organisation' | 'categories' | 'modules' | 'facturation' | 'ia' | 'notifications' | 'score_sante'

const SETTINGS_TABS: { id: SettingsTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'organisation',  label: 'Organisation',  icon: Settings },
  { id: 'categories',    label: 'Catégories',    icon: Tag },
  { id: 'modules',       label: 'Modules',       icon: Boxes },
  { id: 'facturation',   label: 'Facturation',   icon: CreditCard },
  { id: 'ia',            label: 'IA',            icon: Sparkles },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'score_sante',   label: 'Score de santé', icon: Activity },
]

// ── Sub-tab content components ────────────────────────────────

function OrganisationTab({ organisation, updateOrg }: { organisation: Organisation | null; updateOrg: ReturnType<typeof useUpdateOrganisation> }) {
  const [saved, setSaved] = useState(false)
  const [mfaPolicy, setMfaPolicy] = useState<MfaPolicy>('optional')

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
    <div className="space-y-6">
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
              <input {...register('plan')} className="input bg-slate-50 cursor-not-allowed" readOnly value={PLAN_LABELS[organisation?.plan ?? 'free']} />
              <p className="text-xs text-slate-400 mt-1">Contactez le support pour changer de plan.</p>
            </div>
          </div>
          {updateOrg.isError && <p className="text-sm text-danger-500">Erreur lors de la mise à jour.</p>}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={updateOrg.isPending} className="btn-primary flex items-center gap-1.5">
              <Save className="w-4 h-4" />
              {updateOrg.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            {saved && <span className="text-sm text-success-600 font-medium">Sauvegardé ✓</span>}
          </div>
        </form>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <Shield className="w-5 h-5 text-brand-600" />
          <h2 className="font-semibold text-slate-900">Sécurité & MFA</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Politique MFA</label>
            <select value={mfaPolicy} onChange={e => setMfaPolicy(e.target.value as MfaPolicy)} className="input">
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
    </div>
  )
}

function CategoriesTab() {
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <Tag className="w-5 h-5 text-brand-600" />
          <h2 className="font-semibold text-slate-900">Catégories d'actions</h2>
        </div>
        <ActionCategories />
      </div>
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <Tag className="w-5 h-5 text-brand-600" />
          <h2 className="font-semibold text-slate-900">Catégories de processus</h2>
        </div>
        <CategoryManager type="process" title="" />
      </div>
    </div>
  )
}

function ModulesTab({ activeModules }: { activeModules: Module[] }) {
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <Boxes className="w-5 h-5 text-brand-600" />
        <h2 className="font-semibold text-slate-900">Modules actifs</h2>
        <span className="badge badge-neutral text-xs">Lecture seule — contactez le support</span>
      </div>
      {activeModules.length === 0 ? (
        <p className="text-sm text-slate-400">Aucun module activé pour cette organisation.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {activeModules.map(m => (
            <span key={m} className="badge badge-brand text-xs font-semibold">{MODULE_LABELS[m] ?? m}</span>
          ))}
        </div>
      )}
    </div>
  )
}

const PLAN_BADGE: Record<string, string> = {
  free:       'bg-slate-100 text-slate-600 border-slate-200',
  team:       'bg-blue-50 text-blue-700 border-blue-200',
  business:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  pro:        'bg-purple-50 text-purple-700 border-purple-200',
  enterprise: 'bg-amber-50 text-amber-700 border-amber-200',
}

function FacturationTab({ organisation, billing }: {
  organisation: Organisation | null
  billing: { used: number; seat_limit: number; has_capacity: boolean } | undefined
}) {
  const { checkout, openPortal, loading } = useStripeCheckout()

  const plan = organisation?.plan ?? 'free'
  const isFree = plan === 'free'
  const planInfo = PLANS[plan as keyof typeof PLANS]

  const { data: subscription } = useQuery({
    queryKey: ['subscription', organisation?.id],
    enabled: !!organisation && !isFree,
    queryFn: async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('current_period_end, status')
        .eq('organisation_id', organisation!.id)
        .eq('status', 'active')
        .maybeSingle()
      return data
    },
  })

  return (
    <div className="space-y-4">
      {/* Plan actuel */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-5 h-5 text-brand-600" />
          <h2 className="font-semibold text-slate-900">Abonnement</h2>
        </div>

        <div className="flex items-start justify-between gap-4 p-4 bg-slate-50 rounded-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-slate-900 text-lg">{PLAN_LABELS[plan]}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${PLAN_BADGE[plan]}`}>
                {plan.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {planInfo?.seats != null ? `${planInfo.seats} sièges inclus` : 'Sièges illimités'}
              {(organisation?.seats_extra ?? 0) > 0 && ` + ${organisation!.seats_extra} extra`}
              {planInfo && 'price' in planInfo && planInfo.price != null && planInfo.price > 0
                ? ` · ${planInfo.price} €/mois`
                : isFree ? ' · Gratuit' : ''}
            </p>
            {subscription?.current_period_end && (
              <p className="text-xs text-slate-400 mt-1">
                Prochain renouvellement : {format(new Date(subscription.current_period_end), 'd MMMM yyyy', { locale: fr })}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            {isFree ? (
              <button
                onClick={() => checkout('team')}
                disabled={loading}
                className="btn-primary flex items-center gap-1.5 text-sm"
              >
                <ArrowRight className="w-4 h-4" />
                Passer à Team
              </button>
            ) : (
              <button
                onClick={openPortal}
                disabled={loading}
                className="btn-secondary flex items-center gap-1.5 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Gérer l'abonnement
              </button>
            )}
            <Link to="/pricing" className="text-xs text-brand-600 hover:text-brand-700 text-center transition-colors">
              Voir toutes les offres
            </Link>
          </div>
        </div>

        {/* Upgrade features if free */}
        {isFree && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              'Sièges illimités',
              'Export PDF sans filigrane',
              'Support prioritaire',
            ].map(f => (
              <div key={f} className="flex items-center gap-1.5 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" />
                {f}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sièges */}
      {billing && (
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-brand-600" />
            <h2 className="font-semibold text-slate-900">Utilisateurs</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-100 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${billing.has_capacity ? 'bg-brand-500' : 'bg-danger-500'}`}
                style={{ width: `${Math.min(100, Math.round((billing.used / billing.seat_limit) * 100))}%` }}
              />
            </div>
            <span className="text-sm font-medium text-slate-700 shrink-0">
              {billing.used} / {billing.seat_limit}
            </span>
          </div>
          {!billing.has_capacity && (
            <p className="text-xs text-danger-600 mt-2">
              Limite de sièges atteinte.{' '}
              {isFree
                ? <button onClick={() => checkout('team')} className="underline font-medium">Passer à Team</button>
                : <button onClick={openPortal} className="underline font-medium">Ajouter des sièges</button>
              }
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function IaTab({ organisation, updateOrg }: { organisation: Organisation | null; updateOrg: ReturnType<typeof useUpdateOrganisation> }) {
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <Sparkles className="w-5 h-5 text-brand-600" />
        <h2 className="font-semibold text-slate-900">Intelligence Artificielle</h2>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-700 font-medium">Assistance IA (rédaction d'actions)</p>
          <p className="text-xs text-slate-500 mt-0.5">Coût facturé selon l'usage (API Anthropic). Désactivé par défaut.</p>
        </div>
        <button
          onClick={() => organisation && updateOrg.mutate({ id: organisation.id, ai_enabled: !organisation.ai_enabled })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${organisation?.ai_enabled ? 'bg-brand-600' : 'bg-slate-200'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${organisation?.ai_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
      {organisation?.ai_enabled && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-3">
          IA activée — chaque requête consomme des tokens Anthropic (voir votre quota plan).
        </p>
      )}
    </div>
  )
}

type NotifPrefs = {
  email_late_actions: boolean
  email_due_soon: boolean
  email_digest_weekly: boolean
  email_document_approval: boolean
}

const DEFAULT_PREFS: NotifPrefs = {
  email_late_actions: true,
  email_due_soon: true,
  email_digest_weekly: true,
  email_document_approval: true,
}

function NotificationsTab() {
  const { organisation, member } = useOrganisation()
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)

  const { data: prefs = DEFAULT_PREFS } = useQuery({
    queryKey: ['notif_prefs', member?.id],
    enabled: !!member,
    queryFn: async () => {
      const { data } = await supabase
        .from('organisation_members')
        .select('notification_prefs')
        .eq('id', member!.id)
        .single()
      return (data?.notification_prefs as NotifPrefs | null) ?? DEFAULT_PREFS
    },
  })

  async function toggle(key: keyof NotifPrefs) {
    if (!member) return
    setSaving(true)
    const next = { ...prefs, [key]: !prefs[key] }
    await supabase
      .from('organisation_members')
      .update({ notification_prefs: next })
      .eq('id', member.id)
    qc.setQueryData(['notif_prefs', member.id], next)
    setSaving(false)
  }

  void organisation

  const PREFS_CONFIG: { key: keyof NotifPrefs; label: string; description: string }[] = [
    {
      key: 'email_late_actions',
      label: "Rappels d'actions en retard",
      description: "Email quotidien à 8h listant vos actions dont l'échéance est dépassée.",
    },
    {
      key: 'email_due_soon',
      label: 'Échéances proches (J-2)',
      description: "Email 2 jours avant l'échéance de vos actions.",
    },
    {
      key: 'email_digest_weekly',
      label: 'Résumé hebdomadaire',
      description: 'Bilan envoyé chaque lundi matin : actions en retard, terminées, signalements.',
    },
    {
      key: 'email_document_approval',
      label: 'Demandes de validation GED',
      description: 'Notification quand un document passe en revue et nécessite votre validation.',
    },
  ]

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-5">
        <Bell className="w-5 h-5 text-brand-600" />
        <h2 className="font-semibold text-slate-900">Préférences de notification</h2>
        {saving && <span className="text-xs text-slate-400">Enregistrement…</span>}
      </div>
      <div className="space-y-4">
        {PREFS_CONFIG.map(({ key, label, description }) => (
          <div key={key} className="flex items-start justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
            <div>
              <p className="text-sm font-medium text-slate-800">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            </div>
            <button
              onClick={() => toggle(key)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${prefs[key] ? 'bg-brand-600' : 'bg-slate-200'}`}
              role="switch"
              aria-checked={prefs[key]}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${prefs[key] ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-4">
        Ces préférences s'appliquent uniquement à votre compte dans cette organisation.
      </p>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────

export default function AdminSettings() {
  const { organisation } = useOrganisation()
  const updateOrg = useUpdateOrganisation()
  const activeModules = useActiveModules()
  const [activeTab, setActiveTab] = useState<SettingsTab>('organisation')

  const { data: memberCount = 0 } = useQuery({
    queryKey: ['member_count', organisation?.id],
    enabled: !!organisation,
    queryFn: async () => {
      const { count } = await supabase
        .from('organisation_members')
        .select('id', { count: 'exact', head: true })
        .eq('organisation_id', organisation!.id)
        .eq('is_active', true)
      return count ?? 0
    },
  })

  void memberCount

  const { data: billing } = useQuery({
    queryKey: ['billing', organisation?.id],
    enabled: !!organisation,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_billing_status', { p_org_id: organisation!.id })
      if (error) throw error
      return data?.[0] as { used: number; seat_limit: number; has_capacity: boolean } | undefined
    },
  })

  return (
    <div className="max-w-3xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>

        {/* Sub-tabs */}
        <div className="flex items-center gap-0 border-b border-slate-200 overflow-x-auto">
          {SETTINGS_TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors -mb-px shrink-0 ${
                  activeTab === tab.id
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'organisation'  && <OrganisationTab organisation={organisation ?? null} updateOrg={updateOrg} />}
        {activeTab === 'categories'    && <CategoriesTab />}
        {activeTab === 'modules'       && <ModulesTab activeModules={activeModules} />}
        {activeTab === 'facturation'   && <FacturationTab organisation={organisation ?? null} billing={billing} />}
        {activeTab === 'ia'            && <IaTab organisation={organisation ?? null} updateOrg={updateOrg} />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'score_sante'   && <HealthScoreSettings />}
      </motion.div>
    </div>
  )
}
