import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Activity, AlertTriangle, Lightbulb, Save, X, Plus, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Drawer from '@/components/ui/Drawer'
import ActionDrawer from '@/components/modules/ActionDrawer'
import { StatusBadge, PriorityBadge } from '@/components/modules/ActionBadges'
import { useCreateProcess, useUpdateProcess } from '@/hooks/useProcesses'
import { useActions } from '@/hooks/useActions'
import { useIsAtLeast } from '@/hooks/useRole'
import type { Process, ProcessType, ReviewFrequency, Visibility } from '@/types/database'
import type { ActionWithRelations } from '@/hooks/useActions'

const schema = z.object({
  title:            z.string().min(1, 'Titre requis'),
  process_code:     z.string().optional(),
  process_type:     z.enum(['management', 'operational', 'support'] as const),
  description:      z.string().optional(),
  purpose:          z.string().optional(),
  scope:            z.string().optional(),
  review_frequency: z.enum(['monthly', 'quarterly', 'biannual', 'annual'] as const),
  visibility:       z.enum(['public', 'managers', 'restricted', 'confidential'] as const),
})

type FormData = z.infer<typeof schema>

const PROCESS_TYPE_LABELS: Record<ProcessType, string> = {
  management:  'Management',
  operational: 'Opérationnel',
  support:     'Support',
}

const FREQ_LABELS: Record<ReviewFrequency, string> = {
  monthly:   'Mensuelle',
  quarterly: 'Trimestrielle',
  biannual:  'Semestrielle',
  annual:    'Annuelle',
}

const VISIBILITY_LABELS: Record<Visibility, string> = {
  public:        'Public',
  managers:      'Managers+',
  restricted:    'Restreint',
  confidential:  'Confidentiel',
}

function HealthBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-success-500' : score >= 50 ? 'bg-warning-500' : 'bg-danger-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-medium text-slate-700 w-8 text-right">{score}%</span>
    </div>
  )
}

interface Props {
  open: boolean
  onClose: () => void
  process?: Process | null
}

export default function ProcessDrawer({ open, onClose, process }: Props) {
  const isEdit      = !!process
  const canEdit     = useIsAtLeast('manager')
  const [tab, setTab] = useState<'form' | 'nc' | 'kaizen' | 'actions'>('form')
  const [actionDrawerOpen, setActionDrawerOpen] = useState(false)
  const [editAction, setEditAction] = useState<ActionWithRelations | null>(null)

  const createProcess = useCreateProcess()
  const updateProcess = useUpdateProcess()

  const { data: allActions = [] } = useActions()
  const linkedActions = process ? allActions.filter(a => a.process_id === process.id) : []

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title:            '',
      process_code:     '',
      process_type:     'operational',
      description:      '',
      purpose:          '',
      scope:            '',
      review_frequency: 'annual',
      visibility:       'public',
    },
  })

  useEffect(() => {
    if (open) {
      setTab('form')
      setEditAction(null)
      reset(process ? {
        title:            process.title,
        process_code:     process.process_code ?? '',
        process_type:     process.process_type,
        description:      process.description ?? '',
        purpose:          process.purpose ?? '',
        scope:            process.scope ?? '',
        review_frequency: process.review_frequency,
        visibility:       process.visibility,
      } : {
        title: '', process_code: '', process_type: 'operational',
        description: '', purpose: '', scope: '',
        review_frequency: 'annual', visibility: 'public',
      })
    }
  }, [open, process, reset])

  async function onSubmit(data: FormData) {
    try {
      if (isEdit && process) {
        await updateProcess.mutateAsync({ id: process.id, ...data, process_code: data.process_code || null })
      } else {
        await createProcess.mutateAsync({
          title: data.title,
          process_code: data.process_code || null,
          process_type: data.process_type,
          description: data.description || null,
          purpose: data.purpose || null,
          scope: data.scope || null,
          review_frequency: data.review_frequency,
          visibility: data.visibility,
          visibility_user_ids: [],
          status: 'active',
          level: 'process',
          version: '1.0',
          site_id: null, parent_id: null, pilot_id: null, backup_pilot_id: null,
          owner_id: null, category: null, inputs: null, outputs: null,
          resources: null, risks: null, performance_criteria: null,
          last_review_date: null, next_review_date: null,
          health_score: null, diagram_type: null, diagram_data: null,
        })
      }
      onClose()
    } catch { /* mutation error handled by React Query state */ }
  }

  const isPending = createProcess.isPending || updateProcess.isPending

  return (<>
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? process!.title : 'Nouveau processus'}
      footer={
        canEdit ? (
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary flex items-center gap-1.5">
              <X className="w-4 h-4" /> Annuler
            </button>
            <button
              type="submit"
              form="process-form"
              disabled={isPending}
              className="btn-primary flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        ) : undefined
      }
    >
      {/* Health score (view mode on existing process) */}
      {isEdit && process?.health_score !== null && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Score de santé</span>
          </div>
          <HealthBar score={process!.health_score!} />
        </div>
      )}

      {/* Tabs (edit mode) */}
      {isEdit && (
        <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-lg w-fit flex-wrap">
          {([
            { key: 'form'    as const, label: 'Infos',                                    icon: null },
            { key: 'actions' as const, label: `Actions${linkedActions.length ? ` (${linkedActions.length})` : ''}`, icon: Zap },
            { key: 'nc'      as const, label: 'NC',                                       icon: AlertTriangle },
            { key: 'kaizen'  as const, label: 'Kaizen',                                   icon: Lightbulb },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />} {label}
            </button>
          ))}
        </div>
      )}

      {/* NC / Kaizen placeholders */}
      {tab === 'nc' && (
        <p className="text-sm text-slate-500 py-4 text-center">
          Gérez les non-conformités depuis l'onglet NC de la page Processus.
        </p>
      )}
      {tab === 'kaizen' && (
        <p className="text-sm text-slate-500 py-4 text-center">
          Gérez les plans kaizen depuis l'onglet Kaizen de la page Processus.
        </p>
      )}

      {/* Actions liées */}
      {tab === 'actions' && process && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => { setEditAction(null); setActionDrawerOpen(true) }}
              className="btn-primary flex items-center gap-1.5 text-sm"
            >
              <Plus className="w-4 h-4" /> Nouvelle action liée
            </button>
          </div>

          {linkedActions.length === 0 ? (
            <div className="text-center py-8">
              <Zap className="w-8 h-8 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">Aucune action liée à ce processus.</p>
              <button
                type="button"
                onClick={() => { setEditAction(null); setActionDrawerOpen(true) }}
                className="btn-primary mt-3 text-sm"
              >
                Créer la première
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {linkedActions.map(a => (
                <div
                  key={a.id}
                  onClick={() => { setEditAction(a); setActionDrawerOpen(true) }}
                  className="card-hover cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{a.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {a.responsible_profile?.full_name && (
                          <span className="text-xs text-slate-400">→ {a.responsible_profile.full_name}</span>
                        )}
                        {a.due_date && (
                          <span className={`text-xs ${a.status === 'late' ? 'text-danger font-medium' : 'text-slate-400'}`}>
                            {format(new Date(a.due_date), 'd MMM yyyy', { locale: fr })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <PriorityBadge priority={a.priority} />
                      <StatusBadge status={a.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main form */}
      {tab === 'form' && (
        <form id="process-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Titre *</label>
              <input {...register('title')} className="input" placeholder="Ex : Gestion des commandes" />
              {errors.title && <p className="text-xs text-danger-500 mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="label">Code processus</label>
              <input {...register('process_code')} className="input font-mono" placeholder="Ex : PROC-001" />
            </div>

            <div>
              <label className="label">Type *</label>
              <select {...register('process_type')} className="input">
                {(Object.entries(PROCESS_TYPE_LABELS) as [ProcessType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Révision</label>
              <select {...register('review_frequency')} className="input">
                {(Object.entries(FREQ_LABELS) as [ReviewFrequency, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Visibilité</label>
              <select {...register('visibility')} className="input">
                {(Object.entries(VISIBILITY_LABELS) as [Visibility, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea {...register('description')} rows={3} className="input resize-none" placeholder="Décrivez le processus…" />
            </div>

            <div className="col-span-2">
              <label className="label">Objet / Finalité</label>
              <textarea {...register('purpose')} rows={2} className="input resize-none" placeholder="Quel est l'objet de ce processus ?" />
            </div>

            <div className="col-span-2">
              <label className="label">Périmètre</label>
              <textarea {...register('scope')} rows={2} className="input resize-none" placeholder="Périmètre d'application…" />
            </div>
          </div>
        </form>
      )}
    </Drawer>

    <ActionDrawer
      open={actionDrawerOpen}
      onClose={() => { setActionDrawerOpen(false); setEditAction(null) }}
      action={editAction}
      initialProcessId={process?.id}
    />
  </>
  )
}
