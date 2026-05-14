import { useState, useEffect } from 'react'
import { Siren, Plus, X, AlertTriangle, GitBranch, ListChecks, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useHasModule } from '@/hooks/useOrganisation'
import { useAuth } from '@/hooks/useAuth'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useCreateAction } from '@/hooks/useActions'
import { useUpsertIncident } from '@/hooks/useSecurity'
import { useCreateNC } from '@/hooks/useProcesses'
import { useToast } from '@/components/ui/useToast'

export const QUICK_DECLARE_EVENT = 'quick-declare:open'

// ── Types de déclaration disponibles ──────────────────────────

type DeclareType = 'action' | 'nc' | 'incident' | 'near_miss' | 'dangerous_situation'

interface DeclareOption {
  type: DeclareType
  label: string
  sublabel: string
  icon: React.ElementType
  color: string
  module: string | null
}

const OPTIONS: DeclareOption[] = [
  {
    type: 'action',
    label: 'Action',
    sublabel: 'Tâche ou amélioration à faire',
    icon: ListChecks,
    color: 'text-brand-600 bg-brand-50 border-brand-200',
    module: null,
  },
  {
    type: 'nc',
    label: 'Non-conformité',
    sublabel: 'Écart qualité à traiter',
    icon: GitBranch,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    module: 'processus',
  },
  {
    type: 'near_miss',
    label: "Presqu'accident",
    sublabel: 'Événement sans blessure',
    icon: AlertTriangle,
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    module: 'securite',
  },
  {
    type: 'dangerous_situation',
    label: 'Situation dangereuse',
    sublabel: 'Risque identifié sur le terrain',
    icon: AlertTriangle,
    color: 'text-red-600 bg-red-50 border-red-200',
    module: 'securite',
  },
  {
    type: 'incident',
    label: 'Accident / Incident',
    sublabel: 'Accident du travail ou premiers secours',
    icon: AlertTriangle,
    color: 'text-red-700 bg-red-50 border-red-300',
    module: 'securite',
  },
]

// ── Schéma de validation ──────────────────────────────────────

const schema = z.object({
  title:    z.string().min(3, 'Décrivez en 3 mots minimum'),
  location: z.string().optional(),
})
type FormData = z.infer<typeof schema>

// ── Composant principal ───────────────────────────────────────

export default function QuickDeclareButton() {
  const breakpoint   = useBreakpoint()
  const isDesktop    = breakpoint === 'desktop'
  const hasProcessus = useHasModule('processus')
  const hasSecurite  = useHasModule('securite')
  const { user }     = useAuth()
  const toast        = useToast()
  const createAction = useCreateAction()
  const upsertIncident = useUpsertIncident()
  const createNC     = useCreateNC()

  const [open, setOpen]               = useState(false)
  const [selectedType, setSelectedType] = useState<DeclareType | null>(null)
  const [submitting, setSubmitting]   = useState(false)

  // Écoute l'événement global pour ouverture depuis BottomNav mobile
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener(QUICK_DECLARE_EVENT, handler)
    return () => window.removeEventListener(QUICK_DECLARE_EVENT, handler)
  }, [])

  const availableOptions = OPTIONS.filter(opt => {
    if (opt.module === null) return true
    if (opt.module === 'processus') return hasProcessus
    if (opt.module === 'securite') return hasSecurite
    return false
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  function handleOpen() {
    setOpen(true)
    if (availableOptions.length === 1) setSelectedType(availableOptions[0].type)
  }

  function handleClose() {
    setOpen(false)
    setSelectedType(null)
    reset()
  }

  async function onSubmit(data: FormData) {
    if (!selectedType || !user) return
    setSubmitting(true)
    try {
      if (selectedType === 'action') {
        await createAction.mutateAsync({
          title: data.title,
          status: 'todo',
          origin: 'manual',
          priority: 'medium',
        })
      } else if (selectedType === 'nc') {
        await createNC.mutateAsync({
          title: data.title,
          description: data.location ? `Lieu : ${data.location}` : null,
          status: 'open',
          severity: 'minor',
          detected_at: new Date().toISOString().slice(0, 10),
          detected_by: user.id,
          process_id: null,
        })
      } else {
        const incidentTypeMap: Record<string, 'near_miss' | 'dangerous_situation' | 'accident'> = {
          near_miss: 'near_miss',
          dangerous_situation: 'dangerous_situation',
          incident: 'accident',
        }
        await upsertIncident.mutateAsync({
          title: data.title,
          location: data.location ?? null,
          incident_type: incidentTypeMap[selectedType],
          status: 'open',
          declared_by: user.id,
          occurred_at: new Date().toISOString(),
        })
      }
      toast.success('Déclaration enregistrée')
      handleClose()
    } catch {
      toast.error('Erreur lors de la déclaration')
    } finally {
      setSubmitting(false)
    }
  }

  const currentOption = OPTIONS.find(o => o.type === selectedType)

  return (
    <>
      {/* Bouton flottant desktop uniquement */}
      {isDesktop && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-danger text-white rounded-2xl shadow-lg shadow-danger/30 hover:bg-danger/90 transition-all hover:scale-105 active:scale-95"
          title="Déclaration rapide"
        >
          <Siren className="w-5 h-5" />
          <span className="text-sm font-semibold">Déclarer</span>
        </button>
      )}

      {/* Overlay + Modal */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-x-4 bottom-4 sm:inset-auto sm:bottom-20 sm:right-6 sm:w-96 z-50 bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-danger/10 flex items-center justify-center">
                  <Siren className="w-5 h-5 text-danger" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">Déclaration rapide</p>
                  <p className="text-xs text-slate-500">
                    {selectedType
                      ? currentOption?.label
                      : `${availableOptions.length} type${availableOptions.length > 1 ? 's' : ''} disponible${availableOptions.length > 1 ? 's' : ''}`
                    }
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <div className="p-5">
                <AnimatePresence mode="wait">
                  {/* Étape 1 : Choix du type */}
                  {!selectedType && (
                    <motion.div
                      key="type-select"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-2"
                    >
                      {availableOptions.map(opt => {
                        const Icon = opt.icon
                        return (
                          <button
                            key={opt.type}
                            onClick={() => setSelectedType(opt.type)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${opt.color}`}
                          >
                            <Icon className="w-5 h-5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{opt.label}</p>
                              <p className="text-xs opacity-70">{opt.sublabel}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 opacity-50" />
                          </button>
                        )
                      })}
                    </motion.div>
                  )}

                  {/* Étape 2 : Formulaire */}
                  {selectedType && (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                    >
                      {availableOptions.length > 1 && (
                        <button
                          onClick={() => setSelectedType(null)}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-4 transition-colors"
                        >
                          ← Changer de type
                        </button>
                      )}

                      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                        <div>
                          <input
                            {...register('title')}
                            placeholder={
                              selectedType === 'action'
                                ? 'Ex : Mettre à jour la procédure stock'
                                : selectedType === 'nc'
                                ? 'Ex : Produit non conforme lot A42'
                                : selectedType === 'near_miss'
                                ? 'Ex : Chute évitée — escalier humide'
                                : 'Ex : Situation dangereuse identifiée'
                            }
                            className="input w-full"
                            autoFocus
                          />
                          {errors.title && (
                            <p className="text-xs text-danger mt-1">{errors.title.message}</p>
                          )}
                        </div>

                        <input
                          {...register('location')}
                          placeholder="Lieu (optionnel)"
                          className="input w-full"
                        />

                        <button
                          type="submit"
                          disabled={submitting}
                          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {submitting ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                          Enregistrer la déclaration
                        </button>
                        <p className="text-xs text-slate-400 text-center">
                          Vous pourrez ajouter des détails depuis la page dédiée
                        </p>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
