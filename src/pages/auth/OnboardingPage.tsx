import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, ArrowLeft, Building2, Search, Plus, Users,
  CheckCircle2, Loader2, AlertCircle, Inbox, Target, Zap,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import type { MemberInvitation } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────

type OnboardingStep = 'loading' | 'invite' | 'org' | 'usage' | 'setup' | 'done'

type PendingInvite = Pick<MemberInvitation, 'token' | 'role'> & {
  organisation: { id: string; name: string; logo_url: string | null } | null
}

interface OrgResult {
  id: string
  name: string
  logo_url: string | null
  member_count: number
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur', manager: 'Manager', director: 'Directeur',
  contributor: 'Contributeur', terrain: 'Terrain', reader: 'Lecteur',
}

const ONBOARDING_ROLES = [
  { id: 'quality_manager',     label: 'Responsable Qualité',      emoji: '✅' },
  { id: 'hse_manager',         label: 'Responsable HSE',          emoji: '🦺' },
  { id: 'operations_manager',  label: 'Responsable Opérations',   emoji: '⚙️' },
  { id: 'executive',           label: 'Direction',                emoji: '🎯' },
  { id: 'consultant',          label: 'Consultant / Auditeur',    emoji: '🔍' },
  { id: 'other',               label: 'Autre',                    emoji: '👤' },
] as const

const USAGE_OPTIONS = [
  { id: 'actions',    label: 'Plan d\'actions',      emoji: '✅' },
  { id: 'documents',  label: 'GED / Documents',      emoji: '📄' },
  { id: 'processes',  label: 'Processus',            emoji: '🔄' },
  { id: 'indicators', label: 'Indicateurs',          emoji: '📊' },
  { id: 'terrain',    label: 'Remontées terrain',    emoji: '🚨' },
  { id: 'security',   label: 'Sécurité / DUERP',     emoji: '🦺' },
] as const

const SECTORS = [
  { id: 'sdis',           label: 'SDIS / Secours',           emoji: '🚒' },
  { id: 'industrie',      label: 'PME industrielle',         emoji: '🏭' },
  { id: 'distribution',   label: 'Distribution / Logistique', emoji: '📦' },
  { id: 'sante',          label: 'Santé / Médico-social',    emoji: '🏥' },
  { id: 'collectivite',   label: 'Collectivité territoriale', emoji: '🏛️' },
  { id: 'autre',          label: 'Autre secteur',            emoji: '🏢' },
] as const

// ── Validation schemas ────────────────────────────────────────

const orgCreateSchema = z.object({
  name: z.string().min(2, 'Nom requis (minimum 2 caractères)'),
  slug: z.string()
    .min(2, 'Identifiant requis')
    .regex(/^[a-z0-9-]+$/, 'Uniquement lettres minuscules, chiffres et tirets'),
})
type OrgCreateData = z.infer<typeof orgCreateSchema>

// ── Step components ───────────────────────────────────────────

interface StepInvitedProps {
  invites: PendingInvite[]
  onAccept: (token: string) => Promise<void>
  onSkip: () => void
  accepting: string | null
  error: string | null
}

function StepInvited({ invites, onAccept, onSkip, accepting, error }: StepInvitedProps) {
  return (
    <motion.div key="invite" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto mb-4">
          <Inbox className="w-7 h-7 text-brand-600" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          {invites.length === 1 ? 'Invitation en attente' : `${invites.length} invitations en attente`}
        </h1>
        <p className="text-slate-500 mt-2">Rejoignez une organisation ou créez la vôtre.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-3 mb-6">
        {invites.map((inv) => (
          <div key={inv.token} className="card flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {inv.organisation?.logo_url ? (
                <img src={inv.organisation.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-brand-600" />
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-900">{inv.organisation?.name ?? 'Organisation'}</p>
                <p className="text-sm text-slate-500">{ROLE_LABELS[inv.role] ?? inv.role}</p>
              </div>
            </div>
            <button
              onClick={() => onAccept(inv.token)}
              disabled={!!accepting}
              className="btn-primary shrink-0 flex items-center gap-2"
            >
              {accepting === inv.token ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {accepting === inv.token ? 'Acceptation…' : 'Rejoindre'}
            </button>
          </div>
        ))}
      </div>

      <button onClick={onSkip} className="btn-secondary w-full">
        Créer une nouvelle organisation
      </button>
    </motion.div>
  )
}

interface StepOrgProps {
  onCreateNew: (data: OrgCreateData) => Promise<void>
  onJoinExisting: (org: OrgResult, message: string) => Promise<void>
  onBack: (() => void) | null
}

function StepOrganisation({ onCreateNew, onJoinExisting, onBack }: StepOrgProps) {
  const breakpoint = useBreakpoint()
  const [mode, setMode] = useState<'search' | 'create'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OrgResult[]>([])
  const [searching, setSearching] = useState(false)
  const [joinTarget, setJoinTarget] = useState<OrgResult | null>(null)
  const [joinMessage, setJoinMessage] = useState('')
  const [joining, setJoining] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<OrgCreateData>({
    resolver: zodResolver(orgCreateSchema),
  })
  const name = watch('name')

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-organisation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ query: q }),
      })
      const json = await res.json() as { organisations?: OrgResult[] }
      setResults(json.organisations ?? [])
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(t)
  }, [query, doSearch])

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setValue('name', value)
    const slug = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    setValue('slug', slug)
  }

  async function handleCreate(data: OrgCreateData) {
    setCreateError(null)
    try {
      await onCreateNew(data)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erreur lors de la création')
    }
  }

  async function handleJoin() {
    if (!joinTarget) return
    setJoining(true)
    try {
      await onJoinExisting(joinTarget, joinMessage)
    } finally {
      setJoining(false)
    }
  }

  return (
    <motion.div key="org" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
      )}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-7 h-7 text-brand-600" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Votre organisation</h1>
        <p className="text-slate-500 mt-2">Rejoignez une org existante ou créez la vôtre.</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-xl">
        <button
          onClick={() => setMode('search')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'search' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
        >
          <Search className="w-4 h-4" />
          Rejoindre
        </button>
        <button
          onClick={() => setMode('create')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'create' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
        >
          <Plus className="w-4 h-4" />
          Créer
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'search' && (
          <motion.div key="search" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            {joinTarget ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-brand-50 border border-brand-200 rounded-xl">
                  <Building2 className="w-5 h-5 text-brand-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900">{joinTarget.name}</p>
                    <p className="text-xs text-slate-500">{joinTarget.member_count} membre{joinTarget.member_count !== 1 ? 's' : ''}</p>
                  </div>
                  <button onClick={() => setJoinTarget(null)} className="ml-auto text-xs text-slate-400 hover:text-slate-600">Changer</button>
                </div>
                <div>
                  <label className="label">Message pour l'administrateur (optionnel)</label>
                  <textarea
                    value={joinMessage}
                    onChange={e => setJoinMessage(e.target.value)}
                    rows={3}
                    placeholder="Présentez-vous brièvement…"
                    className="input resize-none"
                  />
                </div>
                <button onClick={handleJoin} disabled={joining} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                  {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Envoyer ma demande
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <label htmlFor="org-search" className="sr-only">Rechercher une organisation</label>
                  <input
                    id="org-search"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Rechercher une organisation…"
                    className="input pl-9"
                    autoFocus={breakpoint !== 'mobile'}
                  />
                  {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}
                </div>

                {results.length > 0 && (
                  <div className="space-y-2">
                    {results.map(org => (
                      <button
                        key={org.id}
                        onClick={() => setJoinTarget(org)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50 transition-all text-left"
                      >
                        {org.logo_url ? (
                          <img src={org.logo_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{org.name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Users className="w-3 h-3" /> {org.member_count} membre{org.member_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {query.length >= 2 && !searching && results.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">Aucune organisation trouvée — créez la vôtre.</p>
                )}
              </>
            )}
          </motion.div>
        )}

        {mode === 'create' && (
          <motion.div key="create" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {createError && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {createError}
              </div>
            )}
            <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
              <div>
                <label className="label">Nom de votre organisation</label>
                <input
                  className="input"
                  placeholder="Ex : Société Martin & Co"
                  onChange={handleNameChange}
                  value={name || ''}
                />
                {errors.name && <p className="text-xs text-danger mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Identifiant unique (URL)</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400 shrink-0">pilotos.fr/</span>
                  <input {...register('slug')} className="input" placeholder="martin-co" />
                </div>
                {errors.slug && <p className="text-xs text-danger mt-1">{errors.slug.message}</p>}
              </div>
              <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Créer l'organisation
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface StepUsageProps {
  onNext: (role: string, usages: string[], sector: string) => void
}

function StepUsage({ onNext }: StepUsageProps) {
  const [role, setRole] = useState('')
  const [usages, setUsages] = useState<string[]>([])
  const [sector, setSector] = useState('autre')

  function toggleUsage(id: string) {
    setUsages(prev => prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id])
  }

  return (
    <motion.div key="usage" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto mb-4">
          <Target className="w-7 h-7 text-brand-600" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Votre profil</h1>
        <p className="text-slate-500 mt-2">On personnalise votre expérience.</p>
      </div>

      <div className="space-y-6">
        <div>
          <p className="label mb-3">Votre rôle</p>
          <div className="grid grid-cols-2 gap-2">
            {ONBOARDING_ROLES.map(r => (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${role === r.id ? 'border-brand-600 bg-brand-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
              >
                <span className="text-xl">{r.emoji}</span>
                <span className="text-sm font-medium text-slate-700 leading-tight">{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="label mb-3">Ce que vous souhaitez gérer (plusieurs choix)</p>
          <div className="grid grid-cols-2 gap-2">
            {USAGE_OPTIONS.map(u => (
              <button
                key={u.id}
                onClick={() => toggleUsage(u.id)}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${usages.includes(u.id) ? 'border-brand-600 bg-brand-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
              >
                <span className="text-xl">{u.emoji}</span>
                <span className="text-sm font-medium text-slate-700">{u.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="label mb-3">Secteur d'activité</p>
          <div className="grid grid-cols-2 gap-2">
            {SECTORS.map(s => (
              <button
                key={s.id}
                onClick={() => setSector(s.id)}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${sector === s.id ? 'border-brand-600 bg-brand-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
              >
                <span className="text-xl">{s.emoji}</span>
                <span className="text-sm font-medium text-slate-700 leading-tight">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => onNext(role, usages, sector)}
        disabled={!role}
        className="btn-primary w-full py-3 mt-8 flex items-center justify-center gap-2"
      >
        Configurer mon espace
        <ChevronRight className="w-4 h-4" />
      </button>
      {!role && <p className="text-xs text-slate-400 text-center mt-2">Sélectionnez votre rôle pour continuer</p>}
    </motion.div>
  )
}

// ── Main OnboardingPage ───────────────────────────────────────

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState<OnboardingStep>('loading')
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [accepting, setAccepting] = useState<string | null>(null)
  const [acceptError, setAcceptError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [requestSent, setRequestSent] = useState(false)

  // Check for pending invitations on mount
  useEffect(() => {
    if (!user?.email) return
    supabase
      .from('member_invitations')
      .select('token, role, organisation:organisations(id, name, logo_url)')
      .eq('email', user.email)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .then(({ data }) => {
        if (data && data.length > 0) {
          setPendingInvites(data as unknown as PendingInvite[])
          setStep('invite')
        } else {
          setStep('org')
        }
      })
  }, [user?.email])

  function handleBack() {
    if (step === 'org' && pendingInvites.length > 0) setStep('invite')
  }

  async function acceptInvitation(token: string) {
    setAccepting(token)
    setAcceptError(null)
    const { error } = await supabase.rpc('accept_invitation', { p_token: token })
    if (error) {
      setAcceptError(error.message)
      setAccepting(null)
      return
    }
    setStep('done')
    setTimeout(() => navigate('/app'), 1200)
  }

  async function handleCreateOrg(data: OrgCreateData) {
    if (!user) throw new Error('Non authentifié')

    const { data: org, error: orgError } = await supabase
      .from('organisations')
      .insert({ name: data.name, slug: data.slug })
      .select()
      .single()

    if (orgError) {
      const msg = orgError.code === '23505' ? 'Cet identifiant est déjà pris.' : orgError.message
      throw new Error(msg)
    }

    await supabase.from('organisation_members').insert({
      organisation_id: org.id,
      user_id: user.id,
      role: 'admin',
      accepted_at: new Date().toISOString(),
    })

    setOrgId(org.id)
    setStep('usage')
  }

  async function handleJoinExisting(org: OrgResult, message: string) {
    if (!user) return
    const { data: jr } = await supabase
      .from('join_requests')
      .upsert({ organisation_id: org.id, user_id: user.id, message: message || null, status: 'pending' }, { onConflict: 'organisation_id,user_id' })
      .select('id')
      .maybeSingle()
    if (jr?.id) {
      supabase.functions.invoke('notify-join-request', {
        body: { action: 'created', join_request_id: jr.id },
      }).catch(() => { /* email failure must not block the user */ })
    }
    setRequestSent(true)
    setStep('done')
  }

  async function handleUsageNext(role: string, usages: string[], sector: string) {
    if (!user || !orgId) return

    // Persist onboarding data
    await supabase
      .from('profiles')
      .update({
        onboarding_role: role as NonNullable<import('@/types/database').Profile['onboarding_role']>,
        onboarding_usages: usages,
      })
      .eq('id', user.id)

    // Activate modules based on usages
    const moduleMap: Record<string, string> = {
      actions: 'pilotage', documents: 'ged', processes: 'processus',
      indicators: 'pilotage', terrain: 'terrain', security: 'securite',
    }
    const modulesToActivate = [...new Set(usages.map(u => moduleMap[u]).filter(Boolean))]
    if (modulesToActivate.length > 0) {
      await supabase.from('module_access').upsert(
        modulesToActivate.map(m => ({
          organisation_id: orgId,
          module: m,
          is_active: true,
          activated_at: new Date().toISOString(),
        })),
        { onConflict: 'organisation_id,module' },
      )
    }

    // Seed base GED folders
    await supabase.from('document_folders').insert(
      [
        { name: 'Système de Management', sort_order: 1 },
        { name: 'Processus', sort_order: 2 },
        { name: 'Procédures et Instructions', sort_order: 3 },
        { name: 'Réglementaire & Conformité', sort_order: 4 },
        { name: 'Audits & Revues', sort_order: 5 },
        { name: 'Ressources Humaines', sort_order: 6 },
        { name: 'Enregistrements', sort_order: 7 },
      ].map(f => ({ ...f, organisation_id: orgId, is_system: true })),
    )

    // Mark onboarding as completed
    await supabase
      .from('profiles')
      .update({ onboarding_completed: true, onboarding_step: 4 })
      .eq('id', user.id)

    void sector // sector stored for future template seeding

    setStep('done')
    setTimeout(() => navigate('/app'), 1500)
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto mb-4">
            {requestSent
              ? <Inbox className="w-7 h-7 text-brand-600" aria-hidden="true" />
              : <Zap className="w-7 h-7 text-brand-600" aria-hidden="true" />
            }
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {requestSent ? 'Demande envoyée !' : 'Votre espace est prêt !'}
          </h1>
          <p className="text-slate-500 mt-2">
            {requestSent
              ? 'L\'administrateur de l\'organisation examinera votre demande.'
              : 'Redirection en cours…'}
          </p>
          {requestSent && (
            <div className="mt-6 flex items-center justify-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Vous serez notifié par email</span>
            </div>
          )}
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Progress dots */}
        {(() => {
          const FLOW_STEPS = ['invite', 'org', 'usage', 'setup'] as const
          type FlowStep = typeof FLOW_STEPS[number]
          const currentIdx = FLOW_STEPS.indexOf(step as FlowStep)
          return (
            <div className="flex items-center justify-center gap-2 mb-8">
              {FLOW_STEPS.map((s, i) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${
                    step === s ? 'w-6 bg-brand-600' :
                    i < currentIdx ? 'w-3 bg-brand-300' : 'w-3 bg-slate-200'
                  }`}
                />
              ))}
            </div>
          )
        })()}

        <AnimatePresence mode="wait">
          {step === 'invite' && (
            <StepInvited
              invites={pendingInvites}
              onAccept={acceptInvitation}
              onSkip={() => setStep('org')}
              accepting={accepting}
              error={acceptError}
            />
          )}

          {step === 'org' && (
            <StepOrganisation
              onCreateNew={handleCreateOrg}
              onJoinExisting={handleJoinExisting}
              onBack={pendingInvites.length > 0 ? handleBack : null}
            />
          )}

          {step === 'usage' && (
            <StepUsage onNext={handleUsageNext} />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
