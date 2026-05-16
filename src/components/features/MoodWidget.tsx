import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { SmilePlus, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import MoodPicker from './MoodPicker'
import type { TeamMood } from '@/types/database'

const MOOD_EMOJI = ['', '😟', '😕', '😐', '🙂', '😊']
const MOOD_COLOR = ['', 'bg-red-400', 'bg-orange-400', 'bg-slate-400', 'bg-blue-400', 'bg-green-400']
const MOOD_LABEL = ['', 'Très difficile', 'Difficile', 'Neutre', 'Bien', 'Excellent']

interface Props {
  organisationId: string
  teamPageTo: string
}

export default function MoodWidget({ organisationId, teamPageTo }: Props) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [showPicker, setShowPicker] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  const { data: moods = [] } = useQuery<TeamMood[]>({
    queryKey: ['team_moods_today', organisationId],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_moods')
        .select('*')
        .eq('organisation_id', organisationId)
        .eq('date', today)
      if (error) throw error
      return data as TeamMood[]
    },
  })

  const myMood = moods.find(m => m.user_id === user?.id)
  const avg = moods.length > 0 ? moods.reduce((s, m) => s + m.mood, 0) / moods.length : null

  const distribution = [1, 2, 3, 4, 5].map(v => ({
    value: v,
    count: moods.filter(m => m.mood === v).length,
    pct: moods.length > 0 ? Math.round((moods.filter(m => m.mood === v).length / moods.length) * 100) : 0,
  }))

  function onSaved() {
    qc.invalidateQueries({ queryKey: ['team_moods_today', organisationId] })
    qc.invalidateQueries({ queryKey: ['team_moods', organisationId] })
  }

  return (
    <>
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <SmilePlus className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">Humeur équipe</h3>
            {moods.length > 0 && (
              <span className="text-xs text-slate-400">{moods.length} réponse{moods.length > 1 ? 's' : ''}</span>
            )}
          </div>
          <Link to={teamPageTo} className="flex items-center gap-0.5 text-xs text-brand-600 hover:text-brand-700 font-medium">
            Voir tout <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {moods.length === 0 ? (
          <p className="text-xs text-slate-400 mb-3">Aucune humeur enregistrée aujourd'hui.</p>
        ) : (
          <div className="space-y-1.5 mb-3">
            {distribution.map(d => d.count > 0 && (
              <div key={d.value} className="flex items-center gap-2">
                <span className="text-sm w-5 text-center">{MOOD_EMOJI[d.value]}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${MOOD_COLOR[d.value]}`}
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 w-8 text-right">{d.count}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          {avg !== null ? (
            <p className="text-xs text-slate-500">
              Moyenne : <span className="font-semibold text-slate-700">{MOOD_EMOJI[Math.round(avg)]} {MOOD_LABEL[Math.round(avg)]}</span>
            </p>
          ) : (
            <span />
          )}
          <button
            onClick={() => setShowPicker(true)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              myMood
                ? 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                : 'btn-primary'
            }`}
          >
            {myMood ? `${MOOD_EMOJI[myMood.mood]} Modifier` : '+ Mon humeur'}
          </button>
        </div>
      </div>

      {showPicker && (
        <MoodPicker
          organisationId={organisationId}
          initialMood={myMood?.mood}
          onClose={() => setShowPicker(false)}
          onSaved={onSaved}
        />
      )}
    </>
  )
}
