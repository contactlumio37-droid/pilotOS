import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Calendar, CheckCircle2, Clock, XCircle, ChevronRight, X, Users } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useOrganisation } from '@/hooks/useOrganisation'
import { useToast } from '@/components/ui/useToast'
import PlanGate from '@/components/features/PlanGate'
import type { CodirReviewMeeting } from '@/types/database'

const STATUS_CONFIG = {
  planned:     { label: 'Planifiée',   color: 'badge-neutral',  icon: Clock },
  in_progress: { label: 'En cours',    color: 'badge-brand',    icon: Clock },
  completed:   { label: 'Terminée',    color: 'badge-success',  icon: CheckCircle2 },
  cancelled:   { label: 'Annulée',     color: 'badge-danger',   icon: XCircle },
} as const

type Status = keyof typeof STATUS_CONFIG

const NEXT_STATUS: Partial<Record<Status, Status>> = {
  planned: 'in_progress',
  in_progress: 'completed',
}

function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status]
  return <span className={`badge ${cfg.color} text-xs`}>{cfg.label}</span>
}

interface CreateMeetingForm {
  title: string
  meeting_date: string
  notes: string
  visibility: CodirReviewMeeting['visibility']
}

const EMPTY_FORM: CreateMeetingForm = {
  title: '',
  meeting_date: new Date().toISOString().slice(0, 10),
  notes: '',
  visibility: 'managers',
}

function CreateMeetingModal({ organisationId, onClose }: { organisationId: string; onClose: () => void }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState<CreateMeetingForm>(EMPTY_FORM)

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Non authentifié')
      const { error } = await supabase.from('codir_review_meetings').insert({
        organisation_id: organisationId,
        title: form.title.trim(),
        meeting_date: form.meeting_date,
        notes: form.notes.trim() || null,
        visibility: form.visibility,
        created_by: user.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['codir_meetings', organisationId] })
      toast.success('Réunion planifiée')
      onClose()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-800">Nouvelle réunion CODIR</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Titre *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Revue mensuelle — Juin 2026"
              className="input"
            />
          </div>

          <div>
            <label className="label">Date *</label>
            <input
              type="date"
              value={form.meeting_date}
              onChange={e => setForm(f => ({ ...f, meeting_date: e.target.value }))}
              className="input"
            />
          </div>

          <div>
            <label className="label">Visibilité</label>
            <select
              value={form.visibility}
              onChange={e => setForm(f => ({ ...f, visibility: e.target.value as CodirReviewMeeting['visibility'] }))}
              className="input"
            >
              <option value="public">Publique</option>
              <option value="managers">Managers+</option>
              <option value="restricted">Restreinte</option>
              <option value="confidential">Confidentielle</option>
            </select>
          </div>

          <div>
            <label className="label">Notes <span className="text-slate-400 font-normal">(optionnel)</span></label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              placeholder="Ordre du jour, contexte…"
              className="input resize-none text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!form.title.trim() || !form.meeting_date || createMutation.isPending}
            className="btn-primary flex-1"
          >
            {createMutation.isPending ? 'Création…' : 'Planifier'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MeetingDetail({ meeting, onClose, onRefresh }: {
  meeting: CodirReviewMeeting
  onClose: () => void
  onRefresh: () => void
}) {
  const qc = useQueryClient()
  const toast = useToast()
  const [notes, setNotes] = useState(meeting.notes ?? '')
  const [editing, setEditing] = useState(false)

  const advanceMutation = useMutation({
    mutationFn: async (newStatus: Status) => {
      const { error } = await supabase
        .from('codir_review_meetings')
        .update({ status: newStatus })
        .eq('id', meeting.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['codir_meetings'] })
      onRefresh()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const saveNotesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('codir_review_meetings')
        .update({ notes: notes.trim() || null })
        .eq('id', meeting.id)
      if (error) throw error
    },
    onSuccess: () => {
      setEditing(false)
      qc.invalidateQueries({ queryKey: ['codir_meetings'] })
      toast.success('Notes sauvegardées')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const nextStatus = NEXT_STATUS[meeting.status as Status]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-slate-800 truncate">{meeting.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={meeting.status as Status} />
              <span className="text-xs text-slate-500">
                {format(parseISO(meeting.meeting_date), 'd MMMM yyyy', { locale: fr })}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="ml-3 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notes */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Notes / Compte-rendu</p>
            {!editing && meeting.status !== 'cancelled' && (
              <button onClick={() => setEditing(true)} className="text-xs text-brand-600 hover:underline">Modifier</button>
            )}
          </div>
          {editing ? (
            <div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={6}
                className="input resize-none text-sm w-full"
                placeholder="Compte-rendu de la réunion…"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={() => { setEditing(false); setNotes(meeting.notes ?? '') }} className="btn-secondary text-sm flex-1">Annuler</button>
                <button onClick={() => saveNotesMutation.mutate()} disabled={saveNotesMutation.isPending} className="btn-primary text-sm flex-1">
                  {saveNotesMutation.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap min-h-[60px]">
              {meeting.notes || <span className="text-slate-400 italic">Aucune note</span>}
            </div>
          )}
        </div>

        {/* Advance status */}
        {nextStatus && (
          <button
            onClick={() => advanceMutation.mutate(nextStatus)}
            disabled={advanceMutation.isPending}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {STATUS_CONFIG[nextStatus].label === 'En cours' ? 'Démarrer la réunion' : 'Marquer comme terminée'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function CodirHubPage() {
  const { organisation } = useOrganisation()
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<CodirReviewMeeting | null>(null)

  const { data: meetings = [], refetch } = useQuery<CodirReviewMeeting[]>({
    queryKey: ['codir_meetings', organisation?.id],
    enabled: !!organisation?.id,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('codir_review_meetings')
        .select('*')
        .eq('organisation_id', organisation!.id)
        .order('meeting_date', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as CodirReviewMeeting[]
    },
  })

  if (!organisation) return null

  return (
    <PlanGate required="pro" featureName="CODIR Hub">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">CODIR Hub</h1>
            <p className="text-slate-500 text-sm mt-0.5">Gestion des réunions de pilotage</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Nouvelle réunion
          </button>
        </div>

        {meetings.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Aucune réunion planifiée</p>
            <p className="text-slate-400 text-sm mt-1">Planifiez votre première réunion de pilotage</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
              Planifier une réunion
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {meetings.map(m => {
              const cfg = STATUS_CONFIG[m.status as Status]
              const Icon = cfg.icon
              return (
                <button
                  key={m.id}
                  onClick={() => setSelected(m)}
                  className="card card-hover w-full text-left flex items-center gap-4"
                >
                  <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{m.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-500">
                        {format(parseISO(m.meeting_date), 'd MMM yyyy', { locale: fr })}
                      </span>
                      <StatusBadge status={m.status as Status} />
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateMeetingModal organisationId={organisation.id} onClose={() => setShowCreate(false)} />
      )}

      {selected && (
        <MeetingDetail
          meeting={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => refetch()}
        />
      )}
    </PlanGate>
  )
}
