import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { MapPin, Check, ArrowRight, X, ShieldAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganisation } from '@/hooks/useOrganisation'
import { useAuth } from '@/hooks/useAuth'
import { useCreateAction } from '@/hooks/useActions'
import type { TerrainReport } from '@/types/database'

const CATEGORY_EMOJIS: Record<TerrainReport['category'], string> = {
  safety: '⚠️',
  quality: '⭐',
  equipment: '🔧',
  process: '🔄',
  other: '📋',
}

const STATUS_LABELS: Record<TerrainReport['status'], string> = {
  pending:      'En attente',
  acknowledged: 'Pris en compte',
  converted:    'Action créée',
  closed:       'Clôturé',
}

const STATUS_BADGE: Record<TerrainReport['status'], string> = {
  pending:      'badge-warning',
  acknowledged: 'badge-brand',
  converted:    'badge-success',
  closed:       'badge-neutral',
}

interface ConvertModalProps {
  report: TerrainReport
  onClose: () => void
  onConfirm: (title: string) => void
  isPending: boolean
}

function ConvertModal({ report, onClose, onConfirm, isPending }: ConvertModalProps) {
  const [title, setTitle] = useState(report.title)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Convertir en action</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          Une action sera créée à partir de ce signalement. Vous pouvez modifier son titre.
        </p>

        <div className="mb-4">
          <label className="label">Titre de l'action</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="input"
            placeholder="Titre de l'action"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button
            onClick={() => onConfirm(title)}
            disabled={!title.trim() || isPending}
            className="btn-primary flex items-center gap-1.5"
          >
            <ArrowRight className="w-4 h-4" />
            {isPending ? 'Création…' : 'Créer l\'action'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function TerrainReportsManager() {
  const { organisation } = useOrganisation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const createAction = useCreateAction()
  const [convertingReport, setConvertingReport] = useState<TerrainReport | null>(null)

  const createIncident = useMutation({
    mutationFn: async (report: TerrainReport) => {
      const { error } = await supabase.from('incidents').insert({
        organisation_id:  organisation!.id,
        incident_type:    'dangerous_situation',
        title:            report.title,
        description:      report.description ?? null,
        occurred_at:      report.created_at,
        location:         report.location ?? null,
        declared_by:      user?.id ?? null,
        terrain_report_id: report.id,
        status:           'open',
        visibility:       'confidential',
      })
      if (error) throw error
      // Mark report as acknowledged if still pending
      if (report.status === 'pending') {
        await supabase.from('terrain_reports').update({
          status:          'acknowledged',
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString(),
        }).eq('id', report.id)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terrain_reports_manager'] })
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
    },
  })

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

  async function handleConvert(report: TerrainReport, actionTitle: string) {
    const action = await createAction.mutateAsync({
      title: actionTitle,
      description: report.description ?? undefined,
      origin: 'terrain',
      status: 'todo',
      priority: 'medium',
    })

    // Mark report as converted + link to action
    await supabase
      .from('terrain_reports')
      .update({ status: 'converted', action_id: action.id })
      .eq('id', report.id)

    queryClient.invalidateQueries({ queryKey: ['terrain_reports_manager'] })
    setConvertingReport(null)
  }

  const pending  = reports.filter(r => r.status === 'pending')
  const acked    = reports.filter(r => r.status === 'acknowledged')
  const archived = reports.filter(r => ['converted', 'closed'].includes(r.status))

  return (
    <div className="max-w-4xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Signalements terrain</h1>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>{pending.length} en attente</span>
            <span>·</span>
            <span>{reports.length} total</span>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <Section title={`En attente (${pending.length})`} titleClass="text-danger">
                {pending.map(report => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    borderClass="border-l-warning"
                    actions={
                      <div className="flex gap-2 shrink-0 flex-wrap">
                        <button
                          onClick={() => acknowledge.mutate(report.id)}
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Prendre en compte
                        </button>
                        {report.category === 'safety' && (
                          <button
                            onClick={() => createIncident.mutate(report)}
                            disabled={createIncident.isPending}
                            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 text-amber-700 border-amber-300 hover:bg-amber-50"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            Déclarer incident
                          </button>
                        )}
                        <button
                          onClick={() => setConvertingReport(report)}
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                        >
                          <ArrowRight className="w-3 h-3" />
                          Créer une action
                        </button>
                      </div>
                    }
                  />
                ))}
              </Section>
            )}

            {acked.length > 0 && (
              <Section title={`Pris en compte (${acked.length})`} titleClass="text-brand-600">
                {acked.map(report => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    borderClass="border-l-brand-400"
                    actions={
                      <button
                        onClick={() => setConvertingReport(report)}
                        className="btn-primary text-xs py-1.5 px-3 shrink-0 flex items-center gap-1"
                      >
                        <ArrowRight className="w-3 h-3" />
                        Créer une action
                      </button>
                    }
                  />
                ))}
              </Section>
            )}

            {archived.length > 0 && (
              <Section title="Traités" titleClass="text-slate-500">
                {archived.map(report => (
                  <div key={report.id} className="card opacity-70">
                    <div className="flex items-center gap-3">
                      <span>{CATEGORY_EMOJIS[report.category]}</span>
                      <p className="font-medium text-slate-700 flex-1 truncate">{report.title}</p>
                      <span className={`badge ${STATUS_BADGE[report.status]}`}>
                        {STATUS_LABELS[report.status]}
                      </span>
                    </div>
                  </div>
                ))}
              </Section>
            )}

            {reports.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <p className="text-lg font-medium text-slate-600">Aucun signalement</p>
                <p className="text-sm">Les signalements de vos équipes terrain apparaîtront ici.</p>
              </div>
            )}
          </>
        )}
      </motion.div>

      {convertingReport && (
        <ConvertModal
          report={convertingReport}
          onClose={() => setConvertingReport(null)}
          onConfirm={title => handleConvert(convertingReport, title)}
          isPending={createAction.isPending}
        />
      )}
    </div>
  )
}

function Section({ title, titleClass, children }: {
  title: string
  titleClass: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-6">
      <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${titleClass}`}>{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function ReportCard({ report, borderClass, actions }: {
  report: TerrainReport
  borderClass: string
  actions?: React.ReactNode
}) {
  return (
    <div className={`card border-l-4 ${borderClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span>{CATEGORY_EMOJIS[report.category]}</span>
            <p className="font-medium text-slate-900">{report.title}</p>
          </div>
          {report.description && (
            <p className="text-sm text-slate-500 mb-1 line-clamp-2">{report.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-slate-400">
            {report.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {report.location}
              </span>
            )}
            <span>
              {new Date(report.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
        </div>
        {actions}
      </div>
    </div>
  )
}
