import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Star, Wrench, GitBranch, HelpCircle, Camera, Send, SmilePlus,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCreateTerrainReport } from '@/hooks/useTerrainReports'
import MoodPicker from '@/components/features/MoodPicker'

const CATEGORIES = [
  { id: 'safety', label: 'Sécurité', icon: AlertTriangle, color: 'text-danger bg-danger-light' },
  { id: 'quality', label: 'Qualité', icon: Star, color: 'text-brand-600 bg-brand-100' },
  { id: 'equipment', label: 'Matériel', icon: Wrench, color: 'text-warning bg-warning-light' },
  { id: 'process', label: 'Processus', icon: GitBranch, color: 'text-success bg-success-light' },
  { id: 'other', label: 'Autre', icon: HelpCircle, color: 'text-slate-600 bg-slate-100' },
] as const

type Category = typeof CATEGORIES[number]['id']

const schema = z.object({
  title: z.string().min(3, 'Décrivez en quelques mots'),
  location: z.string().optional(),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function TerrainReportPage() {
  const [category, setCategory] = useState<Category>('other')
  const [submitted, setSubmitted] = useState(false)
  const [showMoodPicker, setShowMoodPicker] = useState(false)
  const [moodDismissed, setMoodDismissed] = useState(false)

  const { user, organisation } = useAuth()
  const qc = useQueryClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: hasMoodToday } = useQuery({
    queryKey: ['team_moods_today', organisation?.id],
    enabled: !!organisation && !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('team_moods')
        .select('id', { count: 'exact', head: true })
        .eq('organisation_id', organisation!.id)
        .eq('user_id', user!.id)
        .eq('date', today)
      return (count ?? 0) > 0
    },
  })

  const createReport = useCreateTerrainReport()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    try {
      await createReport.mutateAsync({
        title: data.title,
        location: data.location || null,
        description: data.description || null,
        category,
      })
      setSubmitted(true)
      reset()
      setTimeout(() => setSubmitted(false), 3000)
    } catch {
      // error silently swallowed — user sees button re-enable
    }
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="min-h-screen flex items-center justify-center p-6"
      >
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Signalement envoyé !</h2>
          <p className="text-slate-500">Votre responsable a été notifié.</p>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4 pt-8">
      {/* Daily mood prompt — shows only if no mood submitted today */}
      {organisation && !hasMoodToday && !moodDismissed && (
        <div className="flex items-center gap-3 bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 mb-4">
          <SmilePlus className="w-4 h-4 text-brand-600 shrink-0" />
          <p className="text-sm text-brand-700 flex-1">Comment vous sentez-vous aujourd'hui ?</p>
          <button
            onClick={() => setShowMoodPicker(true)}
            className="text-xs font-semibold text-brand-700 hover:text-brand-900 px-2 py-1 rounded-lg hover:bg-brand-100 transition-colors"
          >
            Répondre
          </button>
          <button onClick={() => setMoodDismissed(true)} className="text-brand-400 hover:text-brand-600 text-xs px-1">✕</button>
        </div>
      )}

      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Signaler</h1>
        <p className="text-slate-500 mb-6">Un problème ? Faites-le remonter en 30 secondes.</p>

        {/* Catégories */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const isSelected = category === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-slate-100 bg-white hover:border-slate-200'
                }`}
              >
                <span className={`p-1.5 rounded-lg ${cat.color}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-medium text-slate-600 text-center leading-tight">
                  {cat.label}
                </span>
              </button>
            )
          })}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Que s'est-il passé ? *</label>
            <input
              {...register('title')}
              className="input text-base"
              placeholder="Ex : Fuite d'huile sur machine 3"
              autoFocus
            />
            {errors.title && (
              <p className="text-xs text-danger mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="label">Où ?</label>
            <input
              {...register('location')}
              className="input"
              placeholder="Ex : Atelier B, allée 3"
            />
          </div>

          <div>
            <label className="label">Détails (optionnel)</label>
            <textarea
              {...register('description')}
              className="input min-h-[80px] resize-none"
              placeholder="Informations complémentaires..."
            />
          </div>

          {/* Photo (V1) */}
          <button
            type="button"
            className="btn-secondary w-full text-slate-400 border-dashed"
            disabled
          >
            <Camera className="w-4 h-4" />
            Ajouter une photo (bientôt disponible)
          </button>

          <button
            type="submit"
            disabled={createReport.isPending}
            className="btn-primary w-full text-base py-3"
          >
            <Send className="w-4 h-4" />
            {createReport.isPending ? 'Envoi...' : 'Envoyer le signalement'}
          </button>
        </form>
      </motion.div>

      {showMoodPicker && organisation && (
        <MoodPicker
          organisationId={organisation.id}
          onClose={() => setShowMoodPicker(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['team_moods_today', organisation.id] })
            setMoodDismissed(true)
          }}
        />
      )}
    </div>
  )
}
