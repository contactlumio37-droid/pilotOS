import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { X, Send, Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { FeedbackReport, FeedbackStatus } from '@/types/database'

const STATUS_COLS: FeedbackStatus[] = ['new', 'confirmed', 'in_progress', 'resolved']

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  new:         'Nouveau',
  confirmed:   'Confirmé',
  in_progress: 'En cours',
  resolved:    'Résolu',
  wont_fix:    "Won't fix",
  duplicate:   'Doublon',
}

const NEXT_STATUS: Partial<Record<FeedbackStatus, FeedbackStatus>> = {
  new:         'confirmed',
  confirmed:   'in_progress',
  in_progress: 'resolved',
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-900 text-red-300',
  high:     'bg-orange-900 text-orange-300',
  normal:   'bg-slate-700 text-slate-300',
  low:      'bg-slate-800 text-slate-500',
}

const ADMIN_PRIORITY_LABELS: Record<string, string> = {
  low:      'Basse',
  normal:   'Normale',
  high:     'Haute',
  critical: 'Critique',
}

const ADMIN_PRIORITY_COLORS: Record<string, string> = {
  low:      'border-slate-600 text-slate-400 hover:border-slate-500',
  normal:   'border-brand-500 text-brand-400',
  high:     'border-amber-500 text-amber-400',
  critical: 'border-red-500 text-red-400',
}

const CATEGORY_EMOJI: Record<string, string> = {
  bug:        '🐛',
  suggestion: '💡',
  question:   '❓',
  bounty:     '💰',
}

const ALL_STATUSES: FeedbackStatus[] = ['new', 'confirmed', 'in_progress', 'resolved', 'wont_fix', 'duplicate']

type FeedbackPriority = 'low' | 'normal' | 'high' | 'critical'

type EnrichedReport = FeedbackReport & {
  reporter: { id: string; full_name: string | null } | null
  org: { id: string; name: string } | null
}

function useUpdateFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id, status, resolution_note, admin_priority, admin_reply_at,
    }: {
      id: string
      status?: FeedbackStatus
      resolution_note?: string
      admin_priority?: FeedbackPriority
      admin_reply_at?: string
    }) => {
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (status !== undefined)          payload.status = status
      if (resolution_note !== undefined) payload.resolution_note = resolution_note
      if (admin_priority !== undefined)  payload.admin_priority = admin_priority
      if (admin_reply_at !== undefined)  payload.admin_reply_at = admin_reply_at
      const { error } = await supabase.from('feedback_reports').update(payload).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin_feedback'] }),
  })
}

interface DetailDrawerProps {
  report: EnrichedReport
  onClose: () => void
}

function DetailDrawer({ report, onClose }: DetailDrawerProps) {
  const [comment, setComment]         = useState(report.resolution_note ?? '')
  const [status, setStatus]           = useState<FeedbackStatus>(report.status)
  const [adminPriority, setAdminPriority] = useState<FeedbackPriority>(
    (report.admin_priority as FeedbackPriority | undefined) ?? 'normal',
  )
  const [notifying, setNotifying]     = useState(false)
  const [notifyMsg, setNotifyMsg]     = useState<string | null>(null)
  const updateFeedback = useUpdateFeedback()

  async function handleSave() {
    await updateFeedback.mutateAsync({
      id: report.id,
      status,
      resolution_note: comment || undefined,
      admin_priority: adminPriority,
    })
    onClose()
  }

  async function handleNotify() {
    if (!report.reporter_id) {
      setNotifyMsg('Aucun reporter identifié — impossible de notifier.')
      return
    }
    setNotifying(true)
    try {
      await updateFeedback.mutateAsync({
        id: report.id,
        status,
        resolution_note: comment || undefined,
        admin_priority: adminPriority,
        admin_reply_at: new Date().toISOString(),
      })

      const { error } = await supabase.from('notifications').insert({
        user_id: report.reporter_id,
        organisation_id: report.organisation_id ?? null,
        type: 'feedback_reply',
        title: 'Réponse à votre signalement',
        body: `Votre signalement "${report.title}" a été mis à jour : ${STATUS_LABELS[status]}.${comment ? ` "${comment}"` : ''}`,
        action_url: `/feedback#${report.id}`,
      })
      if (error) throw error
      setNotifyMsg('✅ Notification envoyée')
    } catch {
      setNotifyMsg("Erreur lors de l'envoi")
    } finally {
      setNotifying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />

      <div className="w-[480px] max-w-full bg-slate-900 border-l border-slate-700 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-700">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{CATEGORY_EMOJI[report.category] ?? '📋'}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${PRIORITY_COLORS[report.priority]}`}>
                {report.priority}
              </span>
            </div>
            <p className="font-semibold text-white">{report.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {report.description && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Description</p>
              <p className="text-sm text-slate-300 bg-slate-800 rounded-lg p-3">{report.description}</p>
            </div>
          )}

          {/* Reporter */}
          {(report.reporter || report.org) && (
            <div className="bg-slate-800 rounded-lg p-3 space-y-1">
              {report.reporter?.full_name && (
                <p className="text-xs text-slate-400">
                  <span className="text-slate-500">Reporter : </span>
                  {report.reporter.full_name}
                </p>
              )}
              {report.org?.name && (
                <p className="text-xs text-slate-400">
                  <span className="text-slate-500">Organisation : </span>
                  {report.org.name}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            {report.page_url && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Page</p>
                <p className="text-slate-300 text-xs font-mono truncate">{report.page_url}</p>
              </div>
            )}
            {report.browser && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Navigateur</p>
                <p className="text-slate-300 text-xs truncate">{report.browser.split(' ')[0]}</p>
              </div>
            )}
            {report.user_role && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Rôle</p>
                <p className="text-slate-300 text-xs">{report.user_role}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Votes</p>
              <p className="text-slate-300 text-xs">👍 {report.vote_count}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Soumis le</p>
              <p className="text-slate-300 text-xs">{new Date(report.created_at).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          {report.screenshot_url && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Capture d'écran</p>
              <img
                src={report.screenshot_url}
                alt="Screenshot"
                className="rounded-lg border border-slate-700 max-w-full"
              />
            </div>
          )}

          {/* Admin priority */}
          <div>
            <p className="text-xs text-slate-500 mb-2">Priorité admin</p>
            <div className="flex gap-2 flex-wrap">
              {(['low', 'normal', 'high', 'critical'] as FeedbackPriority[]).map(p => (
                <button
                  key={p}
                  onClick={() => setAdminPriority(p)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    adminPriority === p
                      ? `${ADMIN_PRIORITY_COLORS[p]} bg-slate-800`
                      : 'border-slate-700 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  {ADMIN_PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <p className="text-xs text-slate-500 mb-1">Statut</p>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as FeedbackStatus)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>

          {/* Admin comment */}
          <div>
            <p className="text-xs text-slate-500 mb-1">Réponse admin (envoyée à l'utilisateur)</p>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
              placeholder="Décrivez la résolution ou les prochaines étapes…"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {notifyMsg && (
            <p className="text-sm text-slate-300 bg-slate-800 rounded-lg px-3 py-2">{notifyMsg}</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-700 flex gap-2">
          <button
            onClick={handleSave}
            disabled={updateFeedback.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
            Enregistrer
          </button>
          {report.reporter_id && (
            <button
              onClick={handleNotify}
              disabled={notifying}
              className="flex items-center gap-2 px-4 py-2 border border-slate-600 text-slate-300 text-sm rounded-lg hover:border-brand-500 hover:text-brand-400 disabled:opacity-50 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {notifying ? '…' : 'Notifier'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SuperAdminFeedback() {
  const updateFeedback = useUpdateFeedback()
  const [selected, setSelected] = useState<EnrichedReport | null>(null)

  const { data: reports = [] } = useQuery({
    queryKey: ['superadmin_feedback'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_reports')
        .select('*, reporter:profiles!reporter_id(id, full_name), org:organisations!organisation_id(id, name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as EnrichedReport[]
    },
  })

  return (
    <>
      <div>
        <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Bugs & Feedback</h2>
            <div className="flex gap-3 text-sm text-slate-400">
              <span>{reports.filter(r => r.status === 'new').length} nouveaux</span>
              <span>·</span>
              <span>{reports.length} total</span>
            </div>
          </div>

          {/* Kanban */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATUS_COLS.map(col => {
              const items = reports.filter(r => r.status === col)
              return (
                <div key={col} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-slate-300">{STATUS_LABELS[col]}</h2>
                    <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded-full">
                      {items.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {items.map(report => {
                      const next = NEXT_STATUS[report.status]
                      const adminP = (report.admin_priority as string | undefined) ?? 'normal'
                      return (
                        <div
                          key={report.id}
                          className="bg-slate-700 rounded-lg p-3 hover:bg-slate-600 transition-colors group cursor-pointer"
                          onClick={() => setSelected(report)}
                        >
                          <div className="flex items-start gap-1.5 mb-1">
                            <span className="text-sm">{CATEGORY_EMOJI[report.category] ?? '📋'}</span>
                            <p className="text-sm font-medium text-white line-clamp-2 flex-1">
                              {report.title}
                            </p>
                          </div>

                          {report.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-1 mb-1.5 pl-5">{report.description}</p>
                          )}

                          {(report.reporter?.full_name || report.org?.name) && (
                            <p className="text-[10px] text-slate-500 pl-5 truncate mb-1.5">
                              {report.reporter?.full_name ?? ''}
                              {report.reporter?.full_name && report.org?.name ? ' · ' : ''}
                              {report.org?.name ?? ''}
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${PRIORITY_COLORS[report.priority]}`}>
                                {report.priority}
                              </span>
                              {adminP !== 'normal' && (
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${ADMIN_PRIORITY_COLORS[adminP]}`}>
                                  {ADMIN_PRIORITY_LABELS[adminP]}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500">👍 {report.vote_count}</span>
                          </div>

                          {next && (
                            <button
                              onClick={e => { e.stopPropagation(); updateFeedback.mutate({ id: report.id, status: next }) }}
                              className="mt-2 w-full text-[11px] text-brand-400 hover:text-brand-300 py-1 rounded border border-slate-600 hover:border-brand-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              → {STATUS_LABELS[next]}
                            </button>
                          )}
                        </div>
                      )
                    })}

                    {items.length === 0 && (
                      <p className="text-center text-slate-600 text-xs py-4">Aucun signalement</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Won't fix / Duplicate */}
          {reports.filter(r => ['wont_fix', 'duplicate'].includes(r.status)).length > 0 && (
            <div className="mt-6 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h2 className="text-sm font-semibold text-slate-500 mb-3">Archivés (Won't fix / Doublons)</h2>
              <div className="grid grid-cols-2 gap-2">
                {reports
                  .filter(r => ['wont_fix', 'duplicate'].includes(r.status))
                  .map(report => (
                    <div
                      key={report.id}
                      className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg opacity-60 cursor-pointer hover:opacity-100 transition-opacity"
                      onClick={() => setSelected(report)}
                    >
                      <span className="text-xs">{CATEGORY_EMOJI[report.category] ?? '📋'}</span>
                      <span className="text-xs text-slate-400 truncate flex-1">{report.title}</span>
                      <span className="text-[10px] text-slate-500">{STATUS_LABELS[report.status as FeedbackStatus]}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {selected && (
        <DetailDrawer report={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
