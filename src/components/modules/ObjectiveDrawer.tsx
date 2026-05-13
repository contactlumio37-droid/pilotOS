import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sparkles } from 'lucide-react'
import Drawer from '@/components/ui/Drawer'
import { useCreateObjective, useUpdateObjective } from '@/hooks/usePilotage'
import { useToast } from '@/components/ui/useToast'
import { useAiSuggest } from '@/hooks/useAiAssist'
import { suggestObjective } from '@/lib/ai'
import { useOrganisation } from '@/hooks/useOrganisation'
import type { StrategicObjective } from '@/types/database'

const schema = z.object({
  title: z.string().min(3, 'Titre requis'),
  description: z.string().optional(),
  axis: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']),
  kpi_label: z.string().optional(),
  kpi_target: z.coerce.number().optional(),
  kpi_unit: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  visibility: z.enum(['public', 'managers', 'restricted', 'confidential']),
})

type FormData = z.infer<typeof schema>

interface ObjectiveDrawerProps {
  open: boolean
  onClose: () => void
  objective?: StrategicObjective | null
}

export default function ObjectiveDrawer({ open, onClose, objective }: ObjectiveDrawerProps) {
  const isEdit = !!objective
  const create = useCreateObjective()
  const update = useUpdateObjective()
  const toast = useToast()
  const { organisation } = useOrganisation()
  const aiEnabled = (organisation as (typeof organisation & { ai_enabled?: boolean }) | null)?.ai_enabled ?? false
  const ai = useAiSuggest(suggestObjective)
  const [aiInput, setAiInput] = useState('')
  const [showAi, setShowAi] = useState(false)

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'active', visibility: 'managers' },
  })

  useEffect(() => {
    if (!open) { setShowAi(false); setAiInput('') }
  }, [open])

  async function handleAiSuggest() {
    const result = await ai.suggest(aiInput)
    if (!result) return
    setValue('title', result.title)
    setValue('description', result.description)
    setValue('axis', result.axis)
    setShowAi(false)
    setAiInput('')
  }

  useEffect(() => {
    if (objective) {
      reset({
        title: objective.title,
        description: objective.description ?? '',
        axis: objective.axis ?? '',
        status: objective.status,
        kpi_label: objective.kpi_label ?? '',
        kpi_target: objective.kpi_target ?? undefined,
        kpi_unit: objective.kpi_unit ?? '',
        start_date: objective.start_date ?? '',
        end_date: objective.end_date ?? '',
        visibility: objective.visibility,
      })
    } else {
      reset({ title: '', description: '', axis: '', status: 'active', visibility: 'managers' })
    }
  }, [objective, open, reset])

  async function onSubmit(data: FormData) {
    const payload = {
      ...data,
      kpi_target: data.kpi_target ?? undefined,
      start_date: data.start_date || undefined,
      end_date: data.end_date || undefined,
    }
    try {
      if (isEdit) {
        await update.mutateAsync({ id: objective.id, ...payload })
      } else {
        await create.mutateAsync(payload)
      }
      onClose()
    } catch (err) {
      toast.error((err as Error).message ?? 'Erreur lors de l\'enregistrement')
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier l\'objectif' : 'Nouvel objectif stratégique'}
      footer={
        <div className="flex justify-between">
          <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
          <button type="submit" form="objective-form" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      }
    >
      <form id="objective-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!isEdit && aiEnabled && (
          <div>
            {!showAi ? (
              <button
                type="button"
                onClick={() => setShowAi(true)}
                className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                <Sparkles className="w-4 h-4" />
                Remplir avec l'IA
              </button>
            ) : (
              <div className="bg-brand-50 rounded-xl p-4 border border-brand-200">
                <p className="text-xs font-medium text-brand-700 mb-2 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Décrivez votre enjeu stratégique
                </p>
                <textarea
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  placeholder="Ex : Améliorer la satisfaction client en réduisant les délais de livraison…"
                  className="input text-sm resize-none"
                  rows={2}
                />
                {ai.error && <p className="text-xs text-danger mt-1">{ai.error}</p>}
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleAiSuggest}
                    disabled={ai.loading || !aiInput.trim()}
                    className="btn-primary py-1.5 text-sm"
                  >
                    {ai.loading ? 'Génération…' : 'Générer'}
                  </button>
                  <button type="button" onClick={() => setShowAi(false)} className="btn-secondary py-1.5 text-sm">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        <div>
          <label className="label">Titre *</label>
          <input {...register('title')} className="input" placeholder="Ex : Réduire les délais de traitement de 20%" />
          {errors.title && <p className="text-xs text-danger mt-1">{errors.title.message}</p>}
        </div>

        <div>
          <label className="label">Description</label>
          <textarea {...register('description')} className="input resize-none" rows={2} placeholder="Contexte, enjeux…" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Axe stratégique</label>
            <input {...register('axis')} className="input" placeholder="Ex : Performance" />
          </div>
          <div>
            <label className="label">Statut</label>
            <select {...register('status')} className="input">
              <option value="draft">Brouillon</option>
              <option value="active">Actif</option>
              <option value="completed">Atteint</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>
        </div>

        <fieldset className="border border-slate-200 rounded-lg p-4">
          <legend className="text-xs font-medium text-slate-500 px-1">KPI associé (optionnel)</legend>
          <div className="grid grid-cols-3 gap-3 mt-2">
            <div className="col-span-2">
              <label className="label">Indicateur</label>
              <input {...register('kpi_label')} className="input" placeholder="Ex : Taux de satisfaction" />
            </div>
            <div>
              <label className="label">Cible</label>
              <input {...register('kpi_target')} type="number" className="input" placeholder="85" />
            </div>
            <div>
              <label className="label">Unité</label>
              <input {...register('kpi_unit')} className="input" placeholder="%, j, …" />
            </div>
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date début</label>
            <input {...register('start_date')} type="date" className="input" />
          </div>
          <div>
            <label className="label">Date fin</label>
            <input {...register('end_date')} type="date" className="input" />
          </div>
        </div>

        <div>
          <label className="label">Visibilité</label>
          <select {...register('visibility')} className="input">
            <option value="public">Public — tous les membres</option>
            <option value="managers">Managers — managers et au-dessus</option>
            <option value="restricted">Restreint — liste explicite</option>
            <option value="confidential">Confidentiel — moi uniquement</option>
          </select>
        </div>
      </form>
    </Drawer>
  )
}
