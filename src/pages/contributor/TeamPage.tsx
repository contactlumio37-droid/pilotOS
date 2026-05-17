import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { SmilePlus, FileText, Timer } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import PageHeader from '@/components/layout/PageHeader'
import MoodPicker from '@/components/features/MoodPicker'
import type { TeamMood, TeamBriefing } from '@/types/database'

const MOOD_EMOJI = ['', '😟', '😕', '😐', '🙂', '😊']
const MOOD_LABEL = ['', 'Très difficile', 'Difficile', 'Neutre', 'Bien', 'Excellent']

export default function ContributorTeamPage() {
  const { user, organisation } = useAuth()
  const qc = useQueryClient()
  const [showPicker, setShowPicker] = useState(false)

  const orgId = organisation?.id ?? ''
  const today = new Date().toISOString().slice(0, 10)
  const since = subDays(new Date(), 6).toISOString().slice(0, 10)

  const { data: moods = [] } = useQuery<TeamMood[]>({
    queryKey: ['team_moods_week', orgId],
    enabled: !!orgId,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_moods')
        .select('*')
        .eq('organisation_id', orgId)
        .gte('date', since)
        .order('date', { ascending: false })
      if (error) throw error
      return data as TeamMood[]
    },
  })

  const { data: briefings = [] } = useQuery<TeamBriefing[]>({
    queryKey: ['team_briefings', orgId],
    enabled: !!orgId,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_briefings')
        .select('*')
        .eq('organisation_id', orgId)
        .in('status', ['open', 'closed'])
        .order('date', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as TeamBriefing[]
    },
  })

  const todayMoods = moods.filter(m => m.date === today)
  const myMood = todayMoods.find(m => m.user_id === user?.id)
  const avg = todayMoods.length > 0
    ? todayMoods.reduce((s, m) => s + m.mood, 0) / todayMoods.length
    : null

  function onSaved() {
    qc.invalidateQueries({ queryKey: ['team_moods_week', orgId] })
    qc.invalidateQueries({ queryKey: ['team_moods_today', orgId] })
    qc.invalidateQueries({ queryKey: ['team_moods', orgId] })
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Équipe" subtitle="Humeur et briefings" />

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SmilePlus className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-900">Humeur du jour</h2>
            {todayMoods.length > 0 && (
              <span className="text-xs text-slate-400">{todayMoods.length} réponse{todayMoods.length > 1 ? 's' : ''}</span>
            )}
          </div>
          {avg !== null && (
            <span className="text-sm font-medium text-slate-700">
              {MOOD_EMOJI[Math.round(avg)]} {MOOD_LABEL[Math.round(avg)]}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className={`w-full text-sm py-2 rounded-lg font-medium transition-colors ${
            myMood
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              : 'btn-primary'
          }`}
        >
          {myMood ? `${MOOD_EMOJI[myMood.mood]} Modifier mon humeur` : '+ Partager mon humeur'}
        </button>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-slate-900">Briefings récents</h2>
        </div>
        {briefings.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Aucun briefing publié pour le moment.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {briefings.map(b => (
              <div key={b.id} className="py-3">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{b.title ?? 'Briefing équipe'}</p>
                    <p className="text-xs text-slate-400">
                      {format(new Date(b.date), 'd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                    <Timer className="w-3 h-3" />
                    {b.duration_minutes} min
                  </div>
                </div>
                {b.content && (
                  <p className="text-sm text-slate-600 mt-1 whitespace-pre-line line-clamp-3">{b.content}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showPicker && organisation && (
        <MoodPicker
          organisationId={organisation.id}
          initialMood={myMood?.mood}
          onClose={() => setShowPicker(false)}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}
