import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Drawer from '@/components/ui/Drawer'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const schema = z.object({
  category: z.enum(['bug', 'suggestion', 'question']),
  title: z.string().min(5, 'Titre trop court (min 5 caractères)'),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const CATEGORY_OPTIONS = [
  { value: 'bug' as const,        label: 'Bug',        emoji: '🐛' },
  { value: 'suggestion' as const, label: 'Suggestion', emoji: '💡' },
  { value: 'question' as const,   label: 'Question',   emoji: '❓' },
]

interface FeedbackDrawerProps {
  open: boolean
  onClose: () => void
}

export default function FeedbackDrawer({ open, onClose }: FeedbackDrawerProps) {
  const { user, role } = useAuth()
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'bug' },
  })

  const selectedCategory = watch('category')

  async function onSubmit(data: FormData) {
    const { error } = await supabase.from('feedback_reports').insert({
      title: data.title,
      description: data.description || null,
      category: data.category,
      status: 'new',
      priority: 'normal',
      page_url: window.location.href,
      browser: navigator.userAgent,
      reporter_id: user?.id ?? null,
      user_role: role ?? null,
      is_anonymous: false,
    })

    if (!error) {
      setSuccess(true)
      reset()
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 1800)
    }
  }

  function handleClose() {
    reset()
    setSuccess(false)
    onClose()
  }

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title="Signaler un problème ou une idée"
      width="sm"
      footer={
        !success ? (
          <div className="flex justify-between">
            <button type="button" onClick={handleClose} className="btn-secondary">Annuler</button>
            <button type="submit" form="feedback-form" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
        ) : undefined
      }
    >
      {success ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-3">🙏</div>
          <p className="font-semibold text-slate-900">Merci pour votre retour !</p>
          <p className="text-sm text-slate-500 mt-1">Notre équipe prend en compte chaque signalement.</p>
        </div>
      ) : (
        <form id="feedback-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORY_OPTIONS.map((opt) => (
                <label key={opt.value} className="cursor-pointer">
                  <input {...register('category')} type="radio" value={opt.value} className="sr-only" />
                  <div className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${
                    selectedCategory === opt.value
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}>
                    <span className="text-xl">{opt.emoji}</span>
                    <span className="text-xs font-medium text-slate-700">{opt.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Titre *</label>
            <input
              {...register('title')}
              className="input"
              placeholder="Décrivez le problème ou l'idée en une ligne"
            />
            {errors.title && <p className="text-xs text-danger mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="label">Détails (optionnel)</label>
            <textarea
              {...register('description')}
              className="input resize-none"
              rows={4}
              placeholder="Étapes pour reproduire, contexte, captures d'écran…"
            />
          </div>

          <p className="text-xs text-slate-400">
            Page : <span className="font-mono">{window.location.pathname}</span>
          </p>
        </form>
      )}
    </Drawer>
  )
}
