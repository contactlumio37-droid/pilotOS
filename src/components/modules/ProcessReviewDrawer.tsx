import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sparkles } from 'lucide-react'
import Drawer from '@/components/ui/Drawer'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { summarizeProcessReview } from '@/lib/ai'
import type { ProcessReview } from '@/types/database'

const schema = z.object({
  process_id:       z.string().min(1, 'Processus requis'),
  review_date:      z.string().min(1, 'Date requise'),
  findings:         z.string().optional(),
  conclusions:      z.string().optional(),
  next_review_date: z.string().optional(),
  status:           z.enum(['draft', 'completed']),
})

type FormData = z.infer<typeof schema>

interface ProcessReviewDrawerProps {
  open:       boolean
  onClose:    () => void
  review?:    ProcessReview | null
  processes:  { id: string; title: string }[]
}

function useCreateReview() {
  const qc = useQueryClient()
  const { organisation, user } = useAuth()
  return useMutation({
    mutationFn: async (payload: Omit<ProcessReview, 'id' | 'created_at' | 'organisation_id'>) => {
      const { data, error } = await supabase
        .from('process_reviews')
        .insert({ ...payload, organisation_id: organisation!.id, reviewer_id: user!.id })
        .select().single()
      if (error) throw error
      return data as ProcessReview
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['process_reviews'] }),
  })
}

function useUpdateReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<ProcessReview> & { id: string }) => {
      const { data, error } = await supabase
        .from('process_reviews')
        .update(payload).eq('id', id).select().single()
      if (error) throw error
      return data as ProcessReview
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['process_reviews'] }),
  })
}

export default function ProcessReviewDrawer({ open, onClose, review, processes }: ProcessReviewDrawerProps) {
  const isEdit = !!review
  const create = useCreateReview()
  const update = useUpdateReview()
  const { organisation } = useAuth()
  const [aiLoading, setAiLoading] = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      review_date: new Date().toISOString().split('T')[0],
      status: 'draft',
      process_id: processes[0]?.id ?? '',
    },
  })

  const findings = watch('findings')
  const aiEnabled = (organisation as (typeof organisation & { ai_enabled?: boolean }) | null)?.ai_enabled ?? false

  useEffect(() => {
    if (review) {
      reset({
        process_id:       review.process_id,
        review_date:      review.review_date,
        findings:         review.findings ?? '',
        conclusions:      review.conclusions ?? '',
        next_review_date: review.next_review_date ?? '',
        status:           review.status,
      })
    } else {
      reset({
        review_date:  new Date().toISOString().split('T')[0],
        status:       'draft',
        process_id:   processes[0]?.id ?? '',
        findings:     '',
        conclusions:  '',
      })
    }
  }, [review, open, reset, processes])

  async function summarizeWithAI() {
    if (!findings?.trim()) return
    setAiLoading(true)
    try {
      const result = await summarizeProcessReview(findings)
      setValue('conclusions', result.conclusions)
    } catch { /* silent */ }
    finally { setAiLoading(false) }
  }

  async function onSubmit(data: FormData) {
    const payload = {
      process_id:       data.process_id,
      review_date:      data.review_date,
      findings:         data.findings || null,
      conclusions:      data.conclusions || null,
      next_review_date: data.next_review_date || null,
      status:           data.status,
      reviewer_id:      null,
    }
    if (isEdit) {
      await update.mutateAsync({ id: review.id, ...payload })
    } else {
      await create.mutateAsync(payload)
    }
    onClose()
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier la revue' : 'Démarrer une revue de processus'}
      width="lg"
      footer={
        <div className="flex justify-between">
          <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setValue('status', 'draft'); handleSubmit(onSubmit)() }}
              disabled={isSubmitting}
              className="btn-secondary"
            >
              Sauvegarder brouillon
            </button>
            <button
              type="button"
              onClick={() => { setValue('status', 'completed'); handleSubmit(onSubmit)() }}
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? 'Enregistrement…' : 'Clôturer la revue'}
            </button>
          </div>
        </div>
      }
    >
      <form id="review-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Processus *</label>
            <select {...register('process_id')} className="input">
              {processes.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            {errors.process_id && <p className="text-xs text-danger mt-1">{errors.process_id.message}</p>}
          </div>
          <div>
            <label className="label">Date de revue *</label>
            <input {...register('review_date')} type="date" className="input" />
          </div>
        </div>

        <div>
          <label className="label">Constats</label>
          <textarea {...register('findings')} className="input resize-none" rows={4}
            placeholder="Points observés, écarts, risques identifiés, points forts…" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">Conclusions & recommandations</label>
            {aiEnabled && (
              <button type="button" onClick={summarizeWithAI} disabled={aiLoading || !findings?.trim()}
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium disabled:opacity-40"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {aiLoading ? 'Génération…' : 'Résumer avec IA'}
              </button>
            )}
          </div>
          <textarea {...register('conclusions')} className="input resize-none" rows={3}
            placeholder="Synthèse, décisions prises, actions à lancer…" />
        </div>

        <div>
          <label className="label">Prochaine revue prévue</label>
          <input {...register('next_review_date')} type="date" className="input" />
        </div>
      </form>
    </Drawer>
  )
}
