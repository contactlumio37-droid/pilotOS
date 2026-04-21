import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
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

const CATEGORY_EMOJI: Record<string, string> = {
  bug:        '🐛',
  suggestion: '💡',
  question:   '❓',
  bounty:     '💰',
}

function useUpdateFeedbackStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FeedbackStatus }) => {
      const { error } = await supabase
        .from('feedback_reports')
        .update({ status })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin_feedback'] }),
  })
}

export default function SuperAdminFeedback() {
  const updateStatus = useUpdateFeedbackStatus()

  const { data: reports = [] } = useQuery({
    queryKey: ['superadmin_feedback'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_reports')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as FeedbackReport[]
    },
  })

  return (
    <div className="max-w-6xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Bugs & Feedback</h1>
          <div className="flex gap-3 text-sm text-slate-400">
            <span>{reports.filter(r => r.status === 'new').length} nouveaux</span>
            <span>·</span>
            <span>{reports.length} total</span>
          </div>
        </div>

        {/* Kanban */}
        <div className="grid grid-cols-4 gap-4">
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
                    return (
                      <div
                        key={report.id}
                        className="bg-slate-700 rounded-lg p-3 hover:bg-slate-600 transition-colors group"
                      >
                        <div className="flex items-start gap-1.5 mb-1">
                          <span className="text-sm">{CATEGORY_EMOJI[report.category] ?? '📋'}</span>
                          <p className="text-sm font-medium text-white line-clamp-2 flex-1">
                            {report.title}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${PRIORITY_COLORS[report.priority]}`}>
                            {report.priority}
                          </span>
                          <span className="text-[10px] text-slate-500">👍 {report.vote_count}</span>
                        </div>

                        {next && (
                          <button
                            onClick={() => updateStatus.mutate({ id: report.id, status: next })}
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

        {/* Won't fix / Duplicate section */}
        {reports.filter(r => ['wont_fix', 'duplicate'].includes(r.status)).length > 0 && (
          <div className="mt-6 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h2 className="text-sm font-semibold text-slate-500 mb-3">Archivés (Won't fix / Doublons)</h2>
            <div className="grid grid-cols-2 gap-2">
              {reports
                .filter(r => ['wont_fix', 'duplicate'].includes(r.status))
                .map(report => (
                  <div key={report.id} className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg opacity-60">
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
  )
}
