import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { MessageSquarePlus } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import FeedbackDrawer from '@/components/modules/FeedbackDrawer'
import type { FeedbackReport, FeedbackStatus } from '@/types/database'

const STATUS_BADGE: Record<FeedbackStatus, string> = {
  new:         'badge-neutral',
  confirmed:   'badge-brand',
  in_progress: 'badge-warning',
  resolved:    'badge-success',
  wont_fix:    'badge bg-slate-100 text-slate-400',
  duplicate:   'badge bg-slate-100 text-slate-400',
}

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  new:         'Nouveau',
  confirmed:   'Confirmé',
  in_progress: 'En cours',
  resolved:    'Résolu',
  wont_fix:    "Non retenu",
  duplicate:   'Doublon',
}

const CATEGORY_EMOJI: Record<string, string> = {
  bug:        '🐛',
  suggestion: '💡',
  question:   '❓',
  bounty:     '💰',
}

type EnrichedReport = FeedbackReport & {
  reporter: { full_name: string | null } | null
}

export default function MyReportsPage() {
  const { user } = useAuth()
  const [newOpen, setNewOpen] = useState(false)

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['my_feedback_reports', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_reports')
        .select('*, reporter:profiles!reporter_id(full_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as EnrichedReport[]
    },
  })

  const myReports = reports.filter(r => r.reporter_id === user?.id)
  const colleagueReports = reports.filter(r => r.reporter_id !== user?.id)
  const allDisplayed = [...myReports, ...colleagueReports]

  return (
    <div className="max-w-3xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Signalements</h1>
            <p className="text-sm text-slate-500 mt-0.5">{myReports.length} de vous · {colleagueReports.length} de collègues</p>
          </div>
          <button
            onClick={() => setNewOpen(true)}
            className="btn-primary flex items-center gap-1.5"
          >
            <MessageSquarePlus className="w-4 h-4" />
            Nouveau
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 card animate-pulse" />)}
          </div>
        ) : allDisplayed.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-2xl mb-2">🙌</p>
            <p className="font-semibold text-slate-700">Aucun signalement</p>
            <p className="text-sm text-slate-400 mt-1">
              Utilisez le bouton ci-dessus pour nous signaler un bug ou une idée.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {allDisplayed.map(report => {
              const isColleague = report.reporter_id !== user?.id
              const hasReply = !!(report.resolution_note && ['in_progress', 'resolved'].includes(report.status))
              return (
                <div key={report.id} id={report.id} className="card scroll-mt-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">{CATEGORY_EMOJI[report.category] ?? '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{report.title}</p>
                          {isColleague && (
                            <span className="badge badge-neutral text-[10px] shrink-0">Collègue</span>
                          )}
                          {hasReply && (
                            <span className="badge badge-success text-[10px] shrink-0">Réponse</span>
                          )}
                        </div>
                        <span className={`badge shrink-0 ${STATUS_BADGE[report.status]}`}>
                          {STATUS_LABELS[report.status]}
                        </span>
                      </div>
                      {isColleague && report.reporter?.full_name && (
                        <p className="text-xs text-slate-400 mb-1">Par {report.reporter.full_name}</p>
                      )}
                      {report.description && (
                        <p className="text-sm text-slate-500 line-clamp-2">{report.description}</p>
                      )}
                      {report.resolution_note && (
                        <div className="mt-3 bg-brand-50 border border-brand-100 rounded-lg p-3">
                          <p className="text-xs font-semibold text-brand-700 mb-1">
                            Réponse de l'équipe
                            {(report as EnrichedReport & { admin_reply_at?: string | null }).admin_reply_at && (
                              <span className="font-normal text-brand-500 ml-1.5">
                                · {new Date((report as EnrichedReport & { admin_reply_at?: string | null }).admin_reply_at!).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-brand-800">{report.resolution_note}</p>
                        </div>
                      )}
                      <p className="text-xs text-slate-400 mt-2">
                        {new Date(report.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>

      <FeedbackDrawer open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  )
}
