import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/useToast'

const MOODS = [
  { value: 1, emoji: '😟', label: 'Très difficile', color: 'bg-red-100 border-red-300 hover:bg-red-200' },
  { value: 2, emoji: '😕', label: 'Difficile',      color: 'bg-orange-100 border-orange-300 hover:bg-orange-200' },
  { value: 3, emoji: '😐', label: 'Neutre',          color: 'bg-slate-100 border-slate-300 hover:bg-slate-200' },
  { value: 4, emoji: '🙂', label: 'Bien',            color: 'bg-blue-100 border-blue-300 hover:bg-blue-200' },
  { value: 5, emoji: '😊', label: 'Excellent',       color: 'bg-green-100 border-green-300 hover:bg-green-200' },
]

interface Props {
  organisationId: string
  initialMood?: number
  onClose: () => void
  onSaved: () => void
}

export default function MoodPicker({ organisationId, initialMood, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const toast = useToast()
  const [selected, setSelected] = useState<number>(initialMood ?? 0)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!selected || !user) return
    setSaving(true)
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase.from('team_moods').upsert(
      { organisation_id: organisationId, user_id: user.id, mood: selected, note: note.trim() || null, date: today },
      { onConflict: 'organisation_id,user_id,date' },
    )
    setSaving(false)
    if (error) { toast.error('Erreur lors de l\'enregistrement'); return }
    toast.success('Humeur enregistrée ✓')
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-800">Comment vous sentez-vous ?</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 justify-between mb-5">
          {MOODS.map(m => (
            <button
              key={m.value}
              onClick={() => setSelected(m.value)}
              title={m.label}
              className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all ${
                selected === m.value
                  ? m.color + ' border-opacity-100 scale-105 shadow-sm'
                  : 'border-transparent bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-[9px] font-medium text-slate-500 text-center leading-tight">{m.label}</span>
            </button>
          ))}
        </div>

        <div className="mb-4">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder="Note optionnelle (200 car. max)…"
            className="input resize-none text-sm"
          />
          {note && <p className="text-[10px] text-slate-400 text-right mt-0.5">{note.length}/200</p>}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Annuler</button>
          <button onClick={handleSave} disabled={!selected || saving} className="btn-primary flex-1 text-sm">
            {saving ? 'Enregistrement…' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  )
}
