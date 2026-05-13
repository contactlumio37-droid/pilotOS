import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Lock, Trash2, Inbox, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import PageHeader from '@/components/layout/PageHeader'
import CodirDecisionDrawer from '@/components/modules/CodirDecisionDrawer'
import { useCodirDecisions, useDeleteCodirDecision } from '@/hooks/usePilotage'
import { useIsAtLeast } from '@/hooks/useRole'
import { useToast } from '@/components/ui/useToast'
import type { CodirDecision } from '@/types/database'

const VISIBILITY_LABELS: Record<string, string> = {
  public:       'Public',
  managers:     'Managers',
  restricted:   'Restreint',
  confidential: 'Confidentiel',
}

function DecisionCard({
  decision,
  canDelete,
  onDelete,
}: {
  decision: CodirDecision
  canDelete: boolean
  onDelete: (id: string) => void
}) {
  const isRestricted = decision.visibility !== 'public'

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-4 flex items-start gap-4"
    >
      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
        <MessageSquare className="w-5 h-5 text-brand-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 justify-between">
          <p className="font-medium text-slate-800 text-sm">{decision.title}</p>
          <div className="flex items-center gap-2 shrink-0">
            {isRestricted && <Lock className="w-3.5 h-3.5 text-slate-400" />}
            <span className="badge badge-neutral text-xs">{VISIBILITY_LABELS[decision.visibility]}</span>
            {canDelete && (
              <button
                onClick={() => onDelete(decision.id)}
                className="text-slate-300 hover:text-red-400 transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        {decision.description && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{decision.description}</p>
        )}
        <p className="text-xs text-slate-400 mt-1.5">
          {format(new Date(decision.decision_date), 'd MMMM yyyy', { locale: fr })}
        </p>
      </div>
    </motion.div>
  )
}

export default function CodirPage() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const canCreate = useIsAtLeast('manager')
  const canDelete = useIsAtLeast('director')

  const { data: decisions = [], isLoading } = useCodirDecisions()
  const deleteMutation = useDeleteCodirDecision()
  const toast = useToast()

  // Group by year-month
  const groups = decisions.reduce<Record<string, CodirDecision[]>>((acc, d) => {
    const key = format(new Date(d.decision_date), 'MMMM yyyy', { locale: fr })
    if (!acc[key]) acc[key] = []
    acc[key].push(d)
    return acc
  }, {})

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette décision CODIR ?')) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Décision supprimée')
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="CODIR"
        subtitle="Décisions et résolutions du comité de direction"
        actions={
          canCreate ? (
            <button
              onClick={() => setDrawerOpen(true)}
              className="btn-primary flex items-center gap-1.5 text-sm"
            >
              <Plus className="w-4 h-4" />
              Nouvelle décision
            </button>
          ) : undefined
        }
      />

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-24" />
          ))}
        </div>
      )}

      {!isLoading && decisions.length === 0 && (
        <div className="card text-center py-14">
          <Inbox className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="font-medium text-slate-500">Aucune décision CODIR</p>
          {canCreate && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="btn-primary mt-4 text-sm"
            >
              Enregistrer la première décision
            </button>
          )}
        </div>
      )}

      {!isLoading && decisions.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groups).map(([month, items]) => (
            <div key={month}>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 capitalize">
                {month}
              </h3>
              <div className="space-y-2">
                {items.map(d => (
                  <DecisionCard
                    key={d.id}
                    decision={d}
                    canDelete={canDelete}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <CodirDecisionDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
