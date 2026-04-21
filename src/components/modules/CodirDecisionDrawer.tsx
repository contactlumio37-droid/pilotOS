import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Drawer from '@/components/ui/Drawer'
import { useCreateCodirDecision } from '@/hooks/usePilotage'

const schema = z.object({
  title: z.string().min(3, 'Titre requis'),
  description: z.string().optional(),
  decision_date: z.string().min(1, 'Date requise'),
  visibility: z.enum(['public', 'managers', 'restricted', 'confidential']),
})

type FormData = z.infer<typeof schema>

interface CodirDecisionDrawerProps {
  open: boolean
  onClose: () => void
}

export default function CodirDecisionDrawer({ open, onClose }: CodirDecisionDrawerProps) {
  const create = useCreateCodirDecision()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      decision_date: new Date().toISOString().split('T')[0],
      visibility: 'managers',
    },
  })

  async function onSubmit(data: FormData) {
    await create.mutateAsync({
      title: data.title,
      description: data.description || undefined,
      decision_date: data.decision_date,
      visibility: data.visibility,
    })
    reset()
    onClose()
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title="Nouvelle décision CODIR"
      footer={
        <div className="flex justify-between">
          <button type="button" onClick={handleClose} className="btn-secondary">Annuler</button>
          <button type="submit" form="codir-form" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Enregistrement…' : 'Créer'}
          </button>
        </div>
      }
    >
      <form id="codir-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Titre *</label>
          <input
            {...register('title')}
            className="input"
            placeholder="Ex : Déploiement ISO 9001 — validation périmètre Q3"
          />
          {errors.title && <p className="text-xs text-danger mt-1">{errors.title.message}</p>}
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            {...register('description')}
            className="input resize-none"
            rows={3}
            placeholder="Contexte, motivations, parties prenantes…"
          />
        </div>

        <div>
          <label className="label">Date de décision *</label>
          <input {...register('decision_date')} type="date" className="input" />
          {errors.decision_date && <p className="text-xs text-danger mt-1">{errors.decision_date.message}</p>}
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
