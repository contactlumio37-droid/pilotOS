import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const SECTORS = [
  { id: 'sdis', label: 'SDIS / Services secours', emoji: '🚒' },
  { id: 'industrie', label: 'PME industrielle', emoji: '🏭' },
  { id: 'distribution', label: 'Distribution / Logistique', emoji: '📦' },
  { id: 'sante', label: 'Santé / Médico-social', emoji: '🏥' },
  { id: 'collectivite', label: 'Collectivité territoriale', emoji: '🏛️' },
  { id: 'autre', label: 'Autre secteur', emoji: '🏢' },
] as const

const orgSchema = z.object({
  name: z.string().min(2, 'Nom requis'),
  slug: z.string()
    .min(2, 'Identifiant requis')
    .regex(/^[a-z0-9-]+$/, 'Uniquement lettres minuscules, chiffres et tirets'),
})

type OrgFormData = z.infer<typeof orgSchema>

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState<'org' | 'sector' | 'done'>('org')
  const [sector, setSector] = useState<string>('autre')
  const [orgId, setOrgId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<OrgFormData>({
    resolver: zodResolver(orgSchema),
  })

  const name = watch('name')

  // Auto-génère le slug depuis le nom
  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setValue('name', value)
    const slug = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    setValue('slug', slug)
  }

  async function createOrg(data: OrgFormData) {
    if (!user) return
    setError(null)

    const { data: org, error: orgError } = await supabase
      .from('organisations')
      .insert({ name: data.name, slug: data.slug })
      .select()
      .single()

    if (orgError) {
      setError(orgError.code === '23505' ? 'Cet identifiant est déjà pris.' : orgError.message)
      return
    }

    await supabase.from('organisation_members').insert({
      organisation_id: org.id,
      user_id: user.id,
      role: 'admin',
      accepted_at: new Date().toISOString(),
    })

    setOrgId(org.id)
    setStep('sector')
  }

  async function applyTemplate() {
    if (!orgId) return

    // Modules par défaut
    await supabase.from('module_access').insert([
      { organisation_id: orgId, module: 'pilotage', is_active: true, activated_at: new Date().toISOString() },
      { organisation_id: orgId, module: 'processus', is_active: true, activated_at: new Date().toISOString() },
      { organisation_id: orgId, module: 'ged', is_active: true, activated_at: new Date().toISOString() },
    ])

    // Dossiers ISO par défaut
    const folders = [
      { name: 'Système de Management', sort_order: 1 },
      { name: 'Processus', sort_order: 2 },
      { name: 'Procédures et Instructions', sort_order: 3 },
      { name: 'Réglementaire & Conformité', sort_order: 4 },
      { name: 'Audits & Revues', sort_order: 5 },
      { name: 'Ressources Humaines', sort_order: 6 },
      { name: 'Enregistrements', sort_order: 7 },
    ]

    await supabase.from('document_folders').insert(
      folders.map((f) => ({ ...f, organisation_id: orgId, is_system: true })),
    )

    setStep('done')
    setTimeout(() => navigate('/app'), 1500)
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="text-5xl mb-4">🚀</div>
          <h1 className="text-2xl font-bold text-slate-900">Votre espace est prêt !</h1>
          <p className="text-slate-500 mt-2">Redirection en cours...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Étape 1 : Créer l'organisation */}
        <AnimatePresence mode="wait">
          {step === 'org' && (
            <motion.div
              key="org"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
            >
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Bienvenue sur PilotOS</h1>
              <p className="text-slate-500 mb-8">Créons votre espace de travail.</p>

              {error && (
                <div className="bg-danger-light text-danger text-sm rounded-lg px-4 py-3 mb-6">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit(createOrg)} className="space-y-4">
                <div>
                  <label className="label">Nom de votre organisation</label>
                  <input
                    className="input text-base"
                    placeholder="Ex : Société Martin & Co"
                    onChange={handleNameChange}
                    value={name || ''}
                  />
                  {errors.name && (
                    <p className="text-xs text-danger mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Identifiant unique (URL)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400 shrink-0">pilotos.fr/</span>
                    <input
                      {...register('slug')}
                      className="input"
                      placeholder="martin-co"
                    />
                  </div>
                  {errors.slug && (
                    <p className="text-xs text-danger mt-1">{errors.slug.message}</p>
                  )}
                </div>

                <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
                  Créer l'espace
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}

          {/* Étape 2 : Secteur */}
          {step === 'sector' && (
            <motion.div
              key="sector"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
            >
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Votre secteur d'activité</h1>
              <p className="text-slate-500 mb-6">
                On adapte les processus, KPIs et documents à votre métier.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {SECTORS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSector(s.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      sector === s.id
                        ? 'border-brand-600 bg-brand-50'
                        : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
                  >
                    <div className="text-2xl mb-1">{s.emoji}</div>
                    <div className="text-sm font-medium text-slate-700">{s.label}</div>
                  </button>
                ))}
              </div>

              <button
                onClick={applyTemplate}
                className="btn-primary w-full py-3"
              >
                Configurer mon espace
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
