import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, X } from 'lucide-react'
import Drawer from '@/components/ui/Drawer'
import { useCreateNC, useUpdateNC } from '@/hooks/useProcesses'
import type { NonConformity, NcSeverity, NcStatus, Process } from '@/types/database'

const schema = z.object({
  title:        z.string().min(1, 'Titre requis'),
  description:  z.string().optional(),
  severity:     z.enum(['minor', 'major', 'critical'] as const),
  status:       z.enum(['open', 'in_treatment', 'closed'] as const),
  detected_at:  z.string().min(1, 'Date requise'),
  process_id:   z.string().nullable().optional(),
})

type FormData = z.infer<typeof schema>

const SEVERITY_LABELS: Record<NcSeverity, string> = {
  minor:    'Mineure',
  major:    'Majeure',
  critical: 'Critique',
}

const STATUS_LABELS: Record<NcStatus, string> = {
  open:         'Ouverte',
  in_treatment: 'En traitement',
  closed:       'Clôturée',
}

const SEVERITY_CLASS: Record<NcSeverity, string> = {
  minor:    'badge-neutral',
  major:    'badge-warning',
  critical: 'badge-danger',
}

interface Props {
  open: boolean
  onClose: () => void
  nc?: NonConformity | null
  processes?: Pick<Process, 'id' | 'title'>[]
  defaultProcessId?: string
}

export default function NcDrawer({ open, onClose, nc, processes = [], defaultProcessId }: Props) {
  const isEdit  = !!nc
  const createNC = useCreateNC()
  const updateNC = useUpdateNC()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '', description: '',
      severity: 'minor', status: 'open',
      detected_at: new Date().toISOString().slice(0, 10),
      process_id: defaultProcessId ?? null,
    },
  })

  useEffect(() => {
    if (open) {
      reset(nc ? {
        title:       nc.title,
        description: nc.description ?? '',
        severity:    nc.severity,
        status:      nc.status,
        detected_at: nc.detected_at.slice(0, 10),
        process_id:  nc.process_id ?? null,
      } : {
        title: '', description: '',
        severity: 'minor', status: 'open',
        detected_at: new Date().toISOString().slice(0, 10),
        process_id: defaultProcessId ?? null,
      })
    }
  }, [open, nc, defaultProcessId, reset])

  async function onSubmit(data: FormData) {
    try {
      if (isEdit && nc) {
        await updateNC.mutateAsync({ id: nc.id, ...data, process_id: data.process_id ?? null })
      } else {
        await createNC.mutateAsync({
          title: data.title,
          description: data.description || null,
          severity: data.severity,
          status: data.status,
          detected_at: data.detected_at,
          process_id: data.process_id ?? null,
          detected_by: null,
        })
      }
      onClose()
    } catch {}
  }

  const isPending = createNC.isPending || updateNC.isPending

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier la NC' : 'Nouvelle non-conformité'}
      footer={
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary flex items-center gap-1.5">
            <X className="w-4 h-4" /> Annuler
          </button>
          <button
            type="submit"
            form="nc-form"
            disabled={isPending}
            className="btn-primary flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      }
    >
      <form id="nc-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Titre *</label>
          <input {...register('title')} className="input" placeholder="Ex : Défaut qualité produit A" />
          {errors.title && <p className="text-xs text-danger-500 mt-1">{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Gravité *</label>
            <select {...register('severity')} className="input">
              {(Object.entries(SEVERITY_LABELS) as [NcSeverity, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Statut</label>
            <select {...register('status')} className="input">
              {(Object.entries(STATUS_LABELS) as [NcStatus, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Date de détection *</label>
            <input {...register('detected_at')} type="date" className="input" />
            {errors.detected_at && <p className="text-xs text-danger-500 mt-1">{errors.detected_at.message}</p>}
          </div>

          <div>
            <label className="label">Processus lié</label>
            <select {...register('process_id')} className="input">
              <option value="">— Aucun —</option>
              {processes.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea {...register('description')} rows={4} className="input resize-none" placeholder="Décrivez la non-conformité…" />
        </div>

        {/* Preview badge */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Aperçu :</span>
          <span className={`badge ${SEVERITY_CLASS[schema.shape.severity._def.values[0]]}`}>
            {/* shown dynamically below */}
          </span>
        </div>
      </form>
    </Drawer>
  )
}

export { SEVERITY_LABELS, STATUS_LABELS, SEVERITY_CLASS }
