import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { MapPin, Check, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganisation } from '@/hooks/useOrganisation'
import { useAuth } from '@/hooks/useAuth'
import type { TerrainReport } from '@/types/database'

const CATEGORY_EMOJIS: Record<TerrainReport['category'], string> = {
  safety: '⚠️',
  quality: '⭐',
  equipment: '🔧',
  process: '🔄',
  other: '📋',
}

export default function TerrainReportsManager() {
  const { organisation } = useOrganisation()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['terrain_reports_manager', organisation?.id],
    queryFn: async () => {
      if (!organisation) return []
      const { data, error } = await supabase
        .from('terrain_reports')
        .select('*')
        .eq('organisation_id', organisation.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as TerrainReport[]
    },
    enabled: !!organisation,
  })

  const acknowledge = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from('terrain_reports')
        .update({
          status: 'acknowledged',
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', reportId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['terrain_reports_manager'] }),
  })

  const pending = reports.filter((r) => r.status === 'pending')
  const others = reports.filter((r) => r.status !== 'pending')

  return (
    <div className="max-w-4xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Signalements terrain</h1>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-danger uppercase tracking-wide mb-3">
                  En attente ({pending.length})
                </h2>
                <div className="space-y-2">
                  {pending.map((report) => (
                    <div key={report.id} className="card border-l-4 border-l-warning">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span>{CATEGORY_EMOJIS[report.category]}</span>
                            <p className="font-medium text-slate-900">{report.title}</p>
                          </div>
                          {report.location && (
                            <p className="flex items-center gap-1 text-xs text-slate-500">
                              <MapPin className="w-3 h-3" />
                              {report.location}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(report.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => acknowledge.mutate(report.id)}
                            className="btn-secondary text-xs py-1.5 px-3"
                          >
                            <Check className="w-3 h-3" />
                            Prendre en compte
                          </button>
                          <button className="btn-primary text-xs py-1.5 px-3">
                            <ArrowRight className="w-3 h-3" />
                            Créer une action
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {others.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Traités
                </h2>
                <div className="space-y-2">
                  {others.map((report) => (
                    <div key={report.id} className="card opacity-70">
                      <div className="flex items-center gap-3">
                        <span>{CATEGORY_EMOJIS[report.category]}</span>
                        <p className="font-medium text-slate-700 flex-1 truncate">{report.title}</p>
                        <span className="badge badge-success text-xs">{report.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reports.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <p className="text-lg font-medium">Aucun signalement</p>
                <p className="text-sm">Les signalements de vos équipes terrain apparaîtront ici.</p>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  )
}
