import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { SmilePlus, Plus, Trash2, Pencil, Timer, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useOrganisation } from '@/hooks/useOrganisation'
import { useAuth } from '@/hooks/useAuth'
import { useRole } from '@/hooks/useRole'
import { useToast } from '@/components/ui/useToast'
import PageHeader from '@/components/layout/PageHeader'
import MoodPicker from '@/components/features/MoodPicker'
import BriefingEditor from '@/components/features/BriefingEditor'
import type { TeamMood, TeamBriefing } from '@/types/database'

// ── Constants ────────────────────────────────────────────────────────────────

const MOOD_EMOJI  = ['', '😟', '😕', '😐', '🙂', '😊']
const MOOD_COLOR  = ['', '#f87171', '#fb923c', '#94a3b8', '#60a5fa', '#4ade80']
const MOOD_LABEL  = ['', 'Très difficile', 'Difficile', 'Neutre', 'Bien', 'Excellent']

// ── Hooks ────────────────────────────────────────────────────────────────────

function useMoods(organisationId: string, days: number) {
  const since = subDays(new Date(), days).toISOString().slice(0, 10)
  return useQuery<TeamMood[]>({
    queryKey: ['team_moods', organisationId, days],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_moods')
        .select('*')
        .eq('organisation_id', organisationId)
        .gte('date', since)
        .order('date', { ascending: false })
      if (error) throw error
      return data as TeamMood[]
    },
  })
}

function useBriefings(organisationId: string) {
  return useQuery<TeamBriefing[]>({
    queryKey: ['team_briefings', organisationId],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_briefings')
        .select('*')
        .eq('organisation_id', organisationId)
        .order('date', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as TeamBriefing[]
    },
  })
}

// ── Mood trend chart (7 last days) ────────────────────────────────────────────

function MoodTrendChart({ moods }: { moods: TeamMood[] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    const key = d.toISOString().slice(0, 10)
    const dayMoods = moods.filter(m => m.date === key)
    const avg = dayMoods.length > 0
      ? dayMoods.reduce((s, m) => s + m.mood, 0) / dayMoods.length
      : null
    return { date: d, key, avg, count: dayMoods.length }
  })

  return (
    <div className="flex items-end gap-2 h-24 px-2">
      {days.map(d => (
        <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
          <div className="flex-1 w-full flex items-end justify-center">
            {d.avg !== null ? (
              <div
                className="w-full rounded-t-md transition-all"
                style={{
                  height: `${(d.avg / 5) * 100}%`,
                  minHeight: 4,
                  background: MOOD_COLOR[Math.round(d.avg)],
                  opacity: 0.85,
                }}
                title={`${MOOD_EMOJI[Math.round(d.avg)]} ${d.avg.toFixed(1)} · ${d.count} réponse${d.count > 1 ? 's' : ''}`}
              />
            ) : (
              <div className="w-full rounded-t-md bg-slate-100" style={{ height: 4 }} />
            )}
          </div>
          <span className="text-[9px] text-slate-400">
            {format(d.date, 'EEE', { locale: fr }).slice(0, 3)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Mood tab ─────────────────────────────────────────────────────────────────

function MoodTab({ organisationId }: { organisationId: string }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [showPicker, setShowPicker] = useState(false)
  const [rangeDay, setRangeDay] = useState(7)
  const { data: moods = [], isLoading } = useMoods(organisationId, rangeDay)

  const today = new Date().toISOString().slice(0, 10)
  const todayMoods = moods.filter(m => m.date === today)
  const myMood = todayMoods.find(m => m.user_id === user?.id)
  const avg = todayMoods.length > 0
    ? todayMoods.reduce((s, m) => s + m.mood, 0) / todayMoods.length
    : null

  function onSaved() {
    qc.invalidateQueries({ queryKey: ['team_moods', organisationId] })
    qc.invalidateQueries({ queryKey: ['team_moods_today', organisationId] })
  }

  return (
    <div className="space-y-6">
      {/* Header KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-3xl mb-1">{myMood ? MOOD_EMOJI[myMood.mood] : '—'}</p>
          <p className="text-xs text-slate-500">Mon humeur</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-slate-800 mb-1">
            {avg !== null ? MOOD_EMOJI[Math.round(avg)] : '—'}
          </p>
          <p className="text-xs text-slate-500">Moy. équipe {avg !== null ? `(${avg.toFixed(1)})` : ''}</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-slate-800 mb-1">{todayMoods.length}</p>
          <p className="text-xs text-slate-500">Réponses aujourd'hui</p>
        </div>
        <div className="card text-center flex flex-col items-center justify-center gap-2">
          <button
            onClick={() => setShowPicker(true)}
            className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
              myMood ? 'text-slate-600 bg-slate-100 hover:bg-slate-200' : 'btn-primary'
            }`}
          >
            {myMood ? `${MOOD_EMOJI[myMood.mood]} Modifier` : '+ Mon humeur'}
          </button>
        </div>
      </div>

      {/* Trend chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700">Tendance — 7 derniers jours</h3>
          <div className="flex gap-1">
            {([7, 14, 30] as const).map(d => (
              <button
                key={d}
                onClick={() => setRangeDay(d)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  rangeDay === d ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {d}j
              </button>
            ))}
          </div>
        </div>
        {isLoading
          ? <div className="h-24 bg-slate-100 rounded animate-pulse" />
          : <MoodTrendChart moods={moods} />
        }
      </div>

      {/* Today's detail */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Aujourd'hui</h3>
        {todayMoods.length === 0 ? (
          <p className="text-sm text-slate-400">Aucune humeur soumise aujourd'hui.</p>
        ) : (
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(v => {
              const group = todayMoods.filter(m => m.mood === v)
              if (group.length === 0) return null
              return (
                <div key={v} className="flex items-start gap-3">
                  <span className="text-lg leading-none mt-0.5">{MOOD_EMOJI[v]}</span>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-600">{MOOD_LABEL[v]} · {group.length}</p>
                    {group.filter(m => m.note).map(m => (
                      <p key={m.id} className="text-xs text-slate-400 italic mt-0.5">"{m.note}"</p>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showPicker && (
        <MoodPicker
          organisationId={organisationId}
          initialMood={myMood?.mood}
          onClose={() => setShowPicker(false)}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}

// ── Briefings tab ─────────────────────────────────────────────────────────────

function BriefingsTab({ organisationId }: { organisationId: string }) {
  const { user } = useAuth()
  const role = useRole()
  const qc = useQueryClient()
  const toast = useToast()
  const { data: briefings = [], isLoading } = useBriefings(organisationId)
  const [showEditor, setShowEditor] = useState(false)
  const [editing, setEditing] = useState<TeamBriefing | null>(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 10

  const canCreate = ['admin', 'director', 'manager'].includes(role ?? '')
  const paginated = briefings.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(briefings.length / PAGE_SIZE)

  function onSaved() {
    qc.invalidateQueries({ queryKey: ['team_briefings', organisationId] })
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce brief ?')) return
    const { error } = await supabase.from('team_briefings').delete().eq('id', id)
    if (error) { toast.error('Erreur lors de la suppression'); return }
    qc.invalidateQueries({ queryKey: ['team_briefings', organisationId] })
    toast.success('Brief supprimé')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{briefings.length} brief{briefings.length !== 1 ? 's' : ''}</p>
        {canCreate && (
          <button
            onClick={() => { setEditing(null); setShowEditor(true) }}
            className="btn-primary flex items-center gap-1.5 text-sm"
          >
            <Plus className="w-4 h-4" />
            Nouveau brief
          </button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="card h-20 animate-pulse" />)}</div>
      )}

      {!isLoading && briefings.length === 0 && (
        <div className="card text-center py-12">
          <Timer className="w-8 h-8 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Aucun brief enregistré.</p>
          {canCreate && (
            <button onClick={() => setShowEditor(true)} className="btn-primary mt-4 text-sm">
              Créer le premier brief
            </button>
          )}
        </div>
      )}

      {!isLoading && paginated.map(b => (
        <div key={b.id} className="card">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-sm font-semibold text-slate-800">
                  {b.title || `Brief du ${format(new Date(b.date), 'd MMMM', { locale: fr })}`}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Timer className="w-3 h-3" /> {b.duration_minutes} min
                </span>
                <span className="text-xs text-slate-400">
                  {format(new Date(b.date), 'd MMM yyyy', { locale: fr })}
                </span>
              </div>
              {b.content && (
                <p className="text-sm text-slate-600 whitespace-pre-line line-clamp-3">{b.content}</p>
              )}
            </div>
            {b.created_by === user?.id && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => { setEditing(b); setShowEditor(true) }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>{briefings.length} briefings</span>
          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>{page + 1}/{totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {showEditor && (
        <BriefingEditor
          organisationId={organisationId}
          initial={editing ?? undefined}
          onClose={() => { setShowEditor(false); setEditing(null) }}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

type Tab = 'mood' | 'briefings'

export default function TeamPage() {
  const { organisation } = useOrganisation()
  const [activeTab, setActiveTab] = useState<Tab>('mood')

  if (!organisation) return null

  return (
    <div className="max-w-3xl">
      <PageHeader title="Équipe" subtitle="Humeur quotidienne et briefings" />

      <div className="flex gap-0 border-b border-slate-200 mb-6">
        {([
          { id: 'mood', label: 'Humeur', icon: SmilePlus },
          { id: 'briefings', label: 'Briefings', icon: Timer },
        ] as { id: Tab; label: string; icon: React.FC<{ className?: string }> }[]).map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === t.id
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'mood'     && <MoodTab      organisationId={organisation.id} />}
      {activeTab === 'briefings' && <BriefingsTab organisationId={organisation.id} />}
    </div>
  )
}
