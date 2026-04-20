import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { FeedbackReport } from '@/types/database'

const STATUS_COLS = ['new', 'confirmed', 'in_progress', 'resolved'] as const

const STATUS_LABELS: Record<string, string> = {
  new: 'Nouveau',
  confirmed: 'Confirmé',
  in_progress: 'En cours',
  resolved: 'Résolu',
  wont_fix: 'Won\'t fix',
  duplicate: 'Doublon',
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-900 text-red-300',
  high: 'bg-orange-900 text-orange-300',
  normal: 'bg-slate-700 text-slate-300',
  low: 'bg-slate-800 text-slate-500',
}

export default function SuperAdminFeedback() {
  const queryClient = useQueryClient()

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

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('feedback_reports')
        .update({ status })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['superadmin_feedback'] }),
  })

  return (
    <div className="max-w-6xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h1 className="text-2xl font-bold text-white mb-6">Bugs & Feedback</h1>

        {/* Kanban */}
        <div className="grid grid-cols-4 gap-4">
          {STATUS_COLS.map((col) => {
            const items = reports.filter((r) => r.status === col)
            return (
              <div key={col} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-slate-300">
                    {STATUS_LABELS[col]}
                  </h2>
                  <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {items.map((report) => (
                    <div
                      key={report.id}
                      className="bg-slate-700 rounded-lg p-3 cursor-pointer hover:bg-slate-600 transition-colors"
                    >
                      <p className="text-sm font-medium text-white mb-1 line-clamp-2">
                        {report.title}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${PRIORITY_COLORS[report.priority]}`}>
                          {report.priority}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          👍 {report.vote_count}
                        </span>
                      </div>
                    </div>
                  ))}

                  {items.length === 0 && (
                    <p className="text-center text-slate-600 text-xs py-4">Aucun signalement</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
