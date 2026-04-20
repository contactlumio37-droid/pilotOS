import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Eye, EyeOff, Check } from 'lucide-react'
import { signUpWithEmail } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

// ── Constantes ────────────────────────────────────────────────
const SECTORS = [
  { id: 'sdis', label: 'SDIS / Services secours', emoji: '🚒' },
  { id: 'industrie', label: 'PME industrielle', emoji: '🏭' },
  { id: 'distribution', label: 'Distribution / Logistique', emoji: '📦' },
  { id: 'sante', label: 'Santé / Médico-social', emoji: '🏥' },
  { id: 'collectivite', label: 'Collectivité territoriale', emoji: '🏛️' },
  { id: 'autre', label: 'Autre secteur', emoji: '🏢' },
] as const

type Sector = typeof SECTORS[number]['id']

// Dossiers ISO créés par défaut à l'onboarding
const ISO_FOLDERS = [
  { name: 'Système de Management', sort_order: 1 },
  { name: 'Processus', sort_order: 2 },
  { name: 'Procédures et Instructions', sort_order: 3 },
  { name: 'Réglementaire & Conformité', sort_order: 4 },
  { name: 'Audits & Revues', sort_order: 5 },
  { name: 'Ressources Humaines', sort_order: 6 },
  { name: 'Enregistrements', sort_order: 7 },
]

// ── Schémas Zod par étape ─────────────────────────────────────
const accountSchema = z.object({
  full_name: z.string().min(2, 'Prénom et nom requis'),
  email: z.string().email('Email invalide'),
  password: z
    .string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[0-9]/, 'Au moins un chiffre'),
})

const orgSchema = z.object({
  org_name: z.string().min(2, 'Nom requis'),
  slug: z
    .string()
    .min(2, 'Identifiant requis')
    .regex(/^[a-z0-9-]+$/, 'Lettres minuscules, chiffres et tirets uniquement'),
})

type AccountData = z.infer<typeof accountSchema>
type OrgData = z.infer<typeof orgSchema>

// ── Steps ─────────────────────────────────────────────────────
type Step = 'account' | 'org' | 'sector' | 'done'

// ── Composant ─────────────────────────────────────────────────
export default function RegisterPage() {
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('account')
  const [showPassword, setShowPassword] = useState(false)
  const [accountData, setAccountData] = useState<AccountData | null>(null)
  const [orgData, setOrgData] = useState<OrgData | null>(null)
  const [sector, setSector] = useState<Sector>('autre')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Formulaire étape 1
  const accountForm = useForm<AccountData>({ resolver: zodResolver(accountSchema) })
  // Formulaire étape 2
  const orgForm = useForm<OrgData>({ resolver: zodResolver(orgSchema) })

  // Auto-slug depuis le nom d'organisation
  function handleOrgNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    orgForm.setValue('org_name', value)
    const slug = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    orgForm.setValue('slug', slug)
  }

  // Étape 1 → 2
  function handleAccountSubmit(data: AccountData) {
    setAccountData(data)
    setStep('org')
  }

  // Étape 2 → 3
  function handleOrgSubmit(data: OrgData) {
    setOrgData(data)
    setStep('sector')
  }

  // Étape 3 → Création complète
  async function handleFinish() {
    if (!accountData || !orgData) return
    setLoading(true)
    setError(null)

    try {
      // 1. Créer le compte Supabase Auth
      const { data: authData, error: signUpError } = await signUpWithEmail(
        accountData.email,
        accountData.password,
        accountData.full_name,
      )
      if (signUpError || !authData.user) throw signUpError ?? new Error('Échec création compte')

      const userId = authData.user.id

      // 2. Créer l'organisation
      const { data: org, error: orgError } = await supabase
        .from('organisations')
        .insert({ name: orgData.org_name, slug: orgData.slug, plan: 'free' })
        .select()
        .single()
      if (orgError) {
        if (orgError.code === '23505') throw new Error('Cet identifiant est déjà pris. Choisissez-en un autre.')
        throw orgError
      }

      const orgId = org.id

      // 3. Ajouter l'utilisateur comme admin
      await supabase.from('organisation_members').insert({
        organisation_id: orgId,
        user_id: userId,
        role: 'admin',
        accepted_at: new Date().toISOString(),
      })

      // 4. Activer le module pilotage par défaut
      await supabase.from('module_access').insert({
        organisation_id: orgId,
        module: 'pilotage',
        is_active: true,
        activated_at: new Date().toISOString(),
      })

      // 5. Charger les templates du secteur
      const { data: templates } = await supabase
        .from('templates')
        .select('*')
        .eq('sector', sector)
        .eq('is_active', true)

      // Créer les processus depuis les templates
      if (templates) {
        for (const template of templates) {
          if (template.type === 'process') {
            const content = template.content as { processes?: Array<{ title: string; process_code: string; type: string }> }
            const processes = content.processes ?? []
            if (processes.length) {
              await supabase.from('processes').insert(
                processes.map((p) => ({
                  organisation_id: orgId,
                  title: p.title,
                  process_code: p.process_code,
                  process_type: p.type as 'management' | 'operational' | 'support',
                  status: 'active',
                })),
              )
            }
          }
          if (template.type === 'document_tree') {
            const content = template.content as { folders?: Array<{ name: string; children?: Array<{ name: string }> }> }
            const folders = content.folders ?? []
            for (let i = 0; i < folders.length; i++) {
              const { data: parentFolder } = await supabase
                .from('document_folders')
                .insert({ organisation_id: orgId, name: folders[i].name, sort_order: i + 1, is_system: true })
                .select()
                .single()
              if (parentFolder && folders[i].children) {
                await supabase.from('document_folders').insert(
                  (folders[i].children ?? []).map((child, j) => ({
                    organisation_id: orgId,
                    parent_id: parentFolder.id,
                    name: child.name,
                    sort_order: j + 1,
                    is_system: true,
                  })),
                )
              }
            }
          }
        }
      }

      // Dossiers ISO par défaut si aucun template document_tree
      const hasDocTree = templates?.some((t) => t.type === 'document_tree')
      if (!hasDocTree) {
        await supabase.from('document_folders').insert(
          ISO_FOLDERS.map((f) => ({ ...f, organisation_id: orgId, is_system: true })),
        )
      }

      // 6. Envoyer l'email de bienvenue
      await sendEmail({
        to: accountData.email,
        subject: `Bienvenue sur PilotOS, ${accountData.full_name.split(' ')[0]} !`,
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #0F172A; font-size: 24px;">Bienvenue sur PilotOS 🎉</h1>
            <p>Bonjour ${accountData.full_name},</p>
            <p>Votre espace <strong>${orgData.org_name}</strong> est prêt. Commencez à piloter votre organisation dès maintenant.</p>
            <a href="${window.location.origin}/app" style="
              display: inline-block;
              background: #444ce7;
              color: white;
              padding: 12px 24px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              margin: 16px 0;
            ">Accéder à mon espace</a>
            <p style="color: #64748b; font-size: 14px;">
              Besoin d'aide ? Répondez à cet email ou consultez notre documentation.
            </p>
          </div>
        `,
        text: `Bienvenue sur PilotOS ! Votre espace ${orgData.org_name} est prêt. Accédez à votre espace : ${window.location.origin}/app`,
      })

      setStep('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  // ── Rendu ──────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-sm"
        >
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Votre espace est prêt !</h1>
          <p className="text-slate-500 mb-6">
            Vérifiez votre email pour confirmer votre compte, puis connectez-vous.
          </p>
          <button onClick={() => navigate('/login')} className="btn-primary">
            Se connecter
          </button>
        </motion.div>
      </div>
    )
  }

  // Indicateur d'étapes
  const steps: Step[] = ['account', 'org', 'sector']
  const stepIndex = steps.indexOf(step)

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                i <= stepIndex ? 'bg-brand-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="bg-danger-light text-danger text-sm rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ── Étape 1 : Compte ─────────────────────────────── */}
          {step === 'account' && (
            <motion.div
              key="account"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
            >
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Créer mon compte</h1>
              <p className="text-slate-500 mb-8">
                Déjà inscrit ?{' '}
                <Link to="/login" className="text-brand-600 font-medium hover:underline">
                  Se connecter
                </Link>
              </p>

              <form onSubmit={accountForm.handleSubmit(handleAccountSubmit)} className="space-y-4">
                <div>
                  <label className="label">Prénom et nom</label>
                  <input
                    {...accountForm.register('full_name')}
                    className="input"
                    placeholder="Marie Dupont"
                    autoComplete="name"
                    autoFocus
                  />
                  {accountForm.formState.errors.full_name && (
                    <p className="text-xs text-danger mt-1">{accountForm.formState.errors.full_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Email professionnel</label>
                  <input
                    {...accountForm.register('email')}
                    type="email"
                    className="input"
                    placeholder="vous@entreprise.fr"
                    autoComplete="email"
                  />
                  {accountForm.formState.errors.email && (
                    <p className="text-xs text-danger mt-1">{accountForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Mot de passe</label>
                  <div className="relative">
                    <input
                      {...accountForm.register('password')}
                      type={showPassword ? 'text' : 'password'}
                      className="input pr-10"
                      placeholder="Minimum 8 caractères"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {accountForm.formState.errors.password && (
                    <p className="text-xs text-danger mt-1">{accountForm.formState.errors.password.message}</p>
                  )}
                </div>

                <button type="submit" className="btn-primary w-full py-3">
                  Continuer
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>

              <p className="text-center text-xs text-slate-400 mt-6">
                En créant un compte vous acceptez les{' '}
                <a href="/cgu" className="hover:text-slate-600 underline">CGU</a>.
              </p>
            </motion.div>
          )}

          {/* ── Étape 2 : Organisation ───────────────────────── */}
          {step === 'org' && (
            <motion.div
              key="org"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
            >
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Votre organisation</h1>
              <p className="text-slate-500 mb-8">
                Vous serez administrateur de cet espace.
              </p>

              <form onSubmit={orgForm.handleSubmit(handleOrgSubmit)} className="space-y-4">
                <div>
                  <label className="label">Nom de l'organisation</label>
                  <input
                    className="input"
                    placeholder="Ex : Société Martin & Co"
                    autoFocus
                    onChange={handleOrgNameChange}
                    value={orgForm.watch('org_name') ?? ''}
                  />
                  {orgForm.formState.errors.org_name && (
                    <p className="text-xs text-danger mt-1">{orgForm.formState.errors.org_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Identifiant unique</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400 shrink-0 whitespace-nowrap">pilotos.fr/</span>
                    <input
                      {...orgForm.register('slug')}
                      className="input"
                      placeholder="martin-co"
                    />
                  </div>
                  {orgForm.formState.errors.slug && (
                    <p className="text-xs text-danger mt-1">{orgForm.formState.errors.slug.message}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('account')}
                    className="btn-secondary flex-1"
                  >
                    Retour
                  </button>
                  <button type="submit" className="btn-primary flex-1">
                    Continuer
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ── Étape 3 : Secteur ────────────────────────────── */}
          {step === 'sector' && (
            <motion.div
              key="sector"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
            >
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Votre secteur</h1>
              <p className="text-slate-500 mb-6">
                On adapte les processus, KPIs et documents à votre métier.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {SECTORS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSector(s.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                      sector === s.id
                        ? 'border-brand-600 bg-brand-50'
                        : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
                  >
                    {sector === s.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="text-2xl mb-2">{s.emoji}</div>
                    <div className="text-sm font-medium text-slate-700 leading-tight">{s.label}</div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('org')}
                  className="btn-secondary flex-1"
                >
                  Retour
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  {loading ? (
                    <span className="flex items-center gap-2 justify-center">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Création...
                    </span>
                  ) : (
                    <>Créer mon espace <ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
