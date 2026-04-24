import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Drawer from '@/components/ui/Drawer'
import { useCreateKaizen, useUpdateKaizen } from '@/hooks/useProcesses'
import type { KaizenPlan } from '@/types/database'

const schema = z.object({
  title:                    z.string().min(3, 'Titre requis'),
  objective:                z.string().optional(),
  status:                   z.enum(['planned', 'in_progress', 'completed']),
  start_date:               z.string().optional(),
  end_date:                 z.string().optional(),
  estimated_savings_hours:  z.coerce.number().min(0).optional(),
})

type FormData = z.infer<typeof schema>

interface KaizenDrawerProps {
  open:       boolean
  onClose:    () => void
  kaizen?:    KaizenPlan | null
  processId?: string
}

export default function KaizenDrawer({ open, onClose, kaizen, processId }: KaizenDrawerProps) {
  const isEdit = !!kaizen
  const create = useCreateKaizen()
  const update = useUpdateKaizen()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'planned' },
  })

  useEffect(() => {
    if (kaizen) {
      reset({
        title:                   kaizen.title,
        objective:               kaizen.objective ?? '',
        status:                  kaizen.status,
        start_date:              kaizen.start_date ?? '',
        end_date:                kaizen.end_date ?? '',
        estimated_savings_hours: kaizen.estimated_savings_hours ?? undefined,
      })
    } else {
      reset({ title: '', objective: '', status: 'planned', start_date: '', end_date: '' })
    }
  }, [kaizen, open, reset])

  async function onSubmit(data: FormData) {
    const payload = {
      title:                   data.title,
      objective:               data.objective || null,
      status:                  data.status,
      start_date:              data.start_date || null,
      end_date:                data.end_date || null,
      estimated_savings_hours: data.estimated_savings_hours ?? null,
      process_id:              processId ?? kaizen?.process_id ?? null,
      created_by:              null,
    }
    if (isEdit) {
      await update.mutateAsync({ id: kaizen.id, ...payload })
    } else {
      await create.mutateAsync(payload)
    }
    onClose()
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier le plan Kaizen' : 'Nouveau plan Kaizen'}
      footer={
        <div className="flex justify-between">
          <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
          <button type="submit" form="kaizen-form" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      }
    >
      <form id="kaizen-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Titre *</label>
          <input {...register('title')} className="input" placeholder="Ex : Réduire les temps de setup machine de 30%" />
          {errors.title && <p className="text-xs text-danger mt-1">{errors.title.message}</p>}
        </div>

        <div>
          <label className="label">Objectif</label>
          <textarea {...register('objective')} className="input resize-none" rows={2}
            placeholder="Contexte, résultats attendus, indicateur de succès…" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Statut</label>
            <select {...register('status')} className="input">
              <option value="planned">Planifié</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminé</option>
            </select>
          </div>
          <div>
            <label className="label">Économies estimées (h)</label>
            <input {...register('estimated_savings_hours')} type="number" min={0} className="input"
              placeholder="Ex : 8" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date début</label>
            <input {...register('start_date')} type="date" className="input" />
          </div>
          <div>
            <label className="label">Date fin prévue</label>
            <input {...register('end_date')} type="date" className="input" />
          </div>
        </div>
      </form>
    </Drawer>
  )
}
