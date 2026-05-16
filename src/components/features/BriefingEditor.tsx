import { useState } from 'react'
import { X, Timer } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/useToast'
import type { TeamBriefing } from '@/types/database'

const DURATIONS = [5, 10, 15, 30]

interface Props {
  organisationId: string
  initial?: TeamBriefing
  onClose: () => void
  onSaved: () => void
}

export default function BriefingEditor({ organisationId, initial, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const toast = useToast()

  const today = new Date()
  const defaultTitle = `Brief du ${today.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}`

  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [duration, setDuration] = useState(initial?.duration_minutes ?? 5)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!user) return
    setSaving(true)
    const payload = {
      organisation_id: organisationId,
      created_by: user.id,
      title: title.trim() || null,
      content,
      duration_minutes: duration,
      date: today.toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    }
    let error
    if (initial) {
      ;({ error } = await supabase.from('team_briefings').update(payload).eq('id', initial.id))
    } else {
      ;({ error } = await supabase.from('team_briefings').insert(payload))
    }
    setSaving(false)
    if (error) { toast.error('Erreur lors de la sauvegarde'); return }
    toast.success(initial ? 'Brief mis à jour' : 'Brief créé ✓')
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-800">
            {initial ? 'Modifier le brief' : 'Nouveau brief'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Titre <span className="text-slate-400 font-normal">(optionnel)</span></label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={defaultTitle}
              className="input"
            />
          </div>

          <div>
            <label className="label">Durée</label>
            <div className="flex gap-2">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    duration === d
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Timer className="w-3 h-3" />
                  {d} min
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Notes <span className="text-slate-400 font-normal">(points abordés, décisions, suivi…)</span></label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={6}
              placeholder="• Point 1&#10;• Point 2&#10;• Actions décidées…"
              className="input resize-none font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Enregistrement…' : initial ? 'Mettre à jour' : 'Créer le brief'}
          </button>
        </div>
      </div>
    </div>
  )
}
