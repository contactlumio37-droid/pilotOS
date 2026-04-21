import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Lock, TrendingUp, Target, MessageSquare, Inbox } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import PageHeader from '@/components/layout/PageHeader'
import ObjectiveDrawer from '@/components/modules/ObjectiveDrawer'
import CodirDecisionDrawer from '@/components/modules/CodirDecisionDrawer'
import { useObjectives, useCodirDecisions } from '@/hooks/usePilotage'
import { useIsAtLeast } from '@/hooks/useRole'
import type { StrategicObjective } from '@/types/database'

const STATUS_LABELS = {
  draft:     { label: 'Brouillon', className: 'badge-neutral' },
  active:    { label: 'Actif',     className: 'badge-brand' },
  completed: { label: 'Atteint',   className: 'badge-success' },
  cancelled: { label: 'Annulé',    className: 'badge bg-slate-100 text-slate-400' },
}

export default function StrategyPage() {
  const [objDrawerOpen, setObjDrawerOpen] = useState(false)
  const [codirDrawerOpen, setCodirDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<StrategicObjective | null>(null)
  const [tab, setTab] = useState<'objectives' | 'codir'>('objectives')

  const canEdit   = useIsAtLeast('manager')
  const canCreate = useIsAtLeast('director')

  const { data: objectives = [], isLoading: objLoading } = useObjectives()
  const { data: decisions = [], isLoading: coLoading }   = useCodirDecisions()

  function openCreate() { setSelected(null); setObjDrawerOpen(true) }
  function openEdit(o: StrategicObjective) { setSelected(o); setObjDrawerOpen(true) }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Stratégie"
        subtitle="Objectifs stratégiques et décisions CODIR"
        actions={
          canCreate ? (
            <button onClick={openCreate} className="btn-primary flex items-center gap-1.5 text-sm">
              <Plus className="w-4 h-4" />
              Nouvel objectif
            </button>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          <TabBtn active={tab === 'objectives'} onClick={() => setTab('objectives')}>
            <Target className="w-3.5 h-3.5" /> Objectifs ({objectives.length})
          </TabBtn>
          <TabBtn active={tab === 'codir'} onClick={() => setTab('codir')}>
            <MessageSquare className="w-3.5 h-3.5" /> Décisions CODIR ({decisions.length})
          </TabBtn>
        </div>
        {tab === 'codir' && canCreate && (
          <button
            onClick={() => setCodirDrawerOpen(true)}
            className="btn-primary flex items-center gap-1.5 text-sm ml-auto"
          >
            <Plus className="w-4 h-4" />
            Nouvelle décision
          </button>
        )}
      </div>

      {/* Objectifs */}
      {tab === 'objectives' && (
        <>
          {objLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card animate-pulse h-28" />)}
            </div>
          )}

          {!objLoading && objectives.length === 0 && (
            <div className="card text-center py-12">
              <Inbox className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="font-medium text-slate-500">Aucun objectif stratégique</p>
              {canCreate && (
                <button onClick={openCreate} className="btn-primary mt-4 text-sm">
                  Créer le premier objectif
                </button>
              )}
            </div>
          )}

          {!objLoading && objectives.length > 0 && (
            <div className="grid gap-3">
              {objectives.map(obj => {
                const st = STATUS_LABELS[obj.status]
                const isRestricted = obj.visibility !== 'public'
                return (
                  <motion.div
                    key={obj.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => canEdit && openEdit(obj)}
                    className={`card ${canEdit ? 'card-hover cursor-pointer' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {isRestricted && (
                            <span title={`Visibilité : ${obj.visibility}`}>
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                            </span>
                          )}
                          <span className="text-sm font-semibold text-slate-900">{obj.title}</span>
                          {obj.axis && (
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                              {obj.axis}
                            </span>
                          )}
                        </div>
                        {obj.description && (
                          <p className="text-sm text-slate-500 line-clamp-2">{obj.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={st.className}>{st.label}</span>
                      </div>
                    </div>

                    {(obj.kpi_label || obj.start_date || obj.end_date) && (
                      <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                        {obj.kpi_label && (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-brand-400" />
                            {obj.kpi_label}
                            {obj.kpi_target && ` — cible : ${obj.kpi_target}${obj.kpi_unit ? ` ${obj.kpi_unit}` : ''}`}
                          </span>
                        )}
                        {obj.end_date && (
                          <span>Échéance {format(new Date(obj.end_date), 'd MMM yyyy', { locale: fr })}</span>
                        )}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* CODIR Decisions */}
      {tab === 'codir' && (
        <>
          {coLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card animate-pulse h-20" />)}
            </div>
          )}

          {!coLoading && decisions.length === 0 && (
            <div className="card text-center py-12">
              <Inbox className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="font-medium text-slate-500">Aucune décision CODIR enregistrée</p>
              <p className="text-sm text-slate-400 mt-1">
                Les décisions de comité de direction apparaîtront ici.
              </p>
            </div>
          )}

          {!coLoading && decisions.length > 0 && (
            <div className="grid gap-3">
              {decisions.map(d => (
                <motion.div key={d.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {d.visibility !== 'public' && <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                        <span className="text-sm font-semibold text-slate-900">{d.title}</span>
                      </div>
                      {d.description && <p className="text-sm text-slate-500 line-clamp-2">{d.description}</p>}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {format(new Date(d.decision_date), 'd MMM yyyy', { locale: fr })}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      <ObjectiveDrawer
        open={objDrawerOpen}
        onClose={() => setObjDrawerOpen(false)}
        objective={selected}
      />
      <CodirDecisionDrawer
        open={codirDrawerOpen}
        onClose={() => setCodirDrawerOpen(false)}
      />
    </div>
  )
}

function TabBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  )
}
