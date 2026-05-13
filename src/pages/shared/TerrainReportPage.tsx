import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Star, Wrench, GitBranch, HelpCircle, Camera, Send, X, ImagePlus,
} from 'lucide-react'
import { supabase, uploadFile } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useOrganisation } from '@/hooks/useOrganisation'

const CATEGORIES = [
  { id: 'safety',   label: 'Sécurité',   icon: AlertTriangle, color: 'text-danger bg-danger-light' },
  { id: 'quality',  label: 'Qualité',    icon: Star,          color: 'text-brand-600 bg-brand-100' },
  { id: 'equipment',label: 'Matériel',   icon: Wrench,        color: 'text-warning bg-warning-light' },
  { id: 'process',  label: 'Processus',  icon: GitBranch,     color: 'text-success bg-success-light' },
  { id: 'other',    label: 'Autre',      icon: HelpCircle,    color: 'text-slate-600 bg-slate-100' },
] as const

type Category = typeof CATEGORIES[number]['id']

const schema = z.object({
  title:       z.string().min(3, 'Décrivez en quelques mots'),
  location:    z.string().optional(),
  description: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function TerrainReportPage() {
  const [category, setCategory] = useState<Category>('other')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const { organisation } = useOrganisation()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    const url = URL.createObjectURL(file)
    setPhotoPreview(url)
  }

  function removePhoto() {
    setPhoto(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function onSubmit(data: FormData) {
    if (!organisation || !user) return
    setSubmitting(true)
    try {
      const { data: inserted, error } = await supabase
        .from('terrain_reports')
        .insert({
          organisation_id: organisation.id,
          reported_by:     user.id,
          title:           data.title,
          location:        data.location || null,
          description:     data.description || null,
          category,
          status:          'pending',
        })
        .select('id')
        .single()
      if (error) throw error

      if (photo && inserted?.id) {
        const ext = photo.name.split('.').pop() ?? 'jpg'
        const path = `${organisation.id}/${inserted.id}.${ext}`
        const photoUrl = await uploadFile('terrain-photos', path, photo)
        await supabase
          .from('terrain_reports')
          .update({ photo_url: photoUrl })
          .eq('id', inserted.id)
      }

      setSubmitted(true)
      reset()
      removePhoto()
      setTimeout(() => setSubmitted(false), 3000)
    } finally {
      setSubmitting(false)
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

          {/* Photo */}
          {photoPreview ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-200">
              <img src={photoPreview} alt="Aperçu" className="w-full max-h-48 object-cover" />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary w-full flex items-center justify-center gap-2 border-dashed"
            >
              <Camera className="w-4 h-4" />
              <ImagePlus className="w-4 h-4 -ml-1" />
              Ajouter une photo
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,image/heic,image/heif"
            capture="environment"
            className="hidden"
            onChange={handlePhotoSelect}
          />

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full text-base py-3"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Envoi...' : 'Envoyer le signalement'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
