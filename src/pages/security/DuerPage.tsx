import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Pencil, Archive, AlertTriangle } from 'lucide-react'
import { useDuerEvaluations, useUpsertDuer, useDeleteDuer } from '@/hooks/useSecurity'
import type { DuerEvaluation } from '@/hooks/useSecurity'
import { useIsAtLeast } from '@/hooks/useRole'
import { useOrganisation } from '@/hooks/useOrganisation'

const RISK_LABEL: Record<number, { label: string; color: string }> = {
  1:  { label: 'Négligeable', color: 'badge-success'  },
  2:  { label: 'Faible',      color: 'badge-success'  },
  3:  { label: 'Modéré',      color: 'badge-warning'  },
  4:  { label: 'Élevé',       color: 'badge-warning'  },
  5:  { label: 'Critique',    color: 'badge-danger'   },
}

function riskLevel(score: number): { label: string; color: string } {
  if (score <= 4)  return RISK_LABEL[1]
  if (score <= 8)  return RISK_LABEL[2]
  if (score <= 12) return RISK_LABEL[3]
  if (score <= 16) return RISK_LABEL[4]
  return RISK_LABEL[5]
}

interface DrawerProps {
  item: Partial<DuerEvaluation> | null
  onClose: () => void
  orgId: string
}

function DuerDrawer({ item, onClose, orgId }: DrawerProps) {
  const upsert = useUpsertDuer()
  const isEdit = !!item?.id

  const [form, setForm] = useState({
    work_unit:           item?.work_unit           ?? '',
    hazard:              item?.hazard              ?? '',
    risk_description:    item?.risk_description    ?? '',
    probability:         item?.probability         ?? 3,
    severity:            item?.severity            ?? 3,
    prevention_measures: item?.prevention_measures ?? '',
    review_date:         item?.review_date         ?? '',
  })

  async function save() {
    await upsert.mutateAsync({ ...form, id: item?.id, organisation_id: orgId } as Parameters<typeof upsert.mutateAsync>[0])
    onClose()
  }

  const f = (field: keyof typeof form, val: string | number) => setForm(p => ({ ...p, [field]: val }))

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full max-w-lg bg-white shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-semibold text-slate-900">{isEdit ? 'Modifier l\'évaluation' : 'Nouvelle évaluation'}</h2>
          <button onClick={onClose} className="btn-secondary text-sm py-1.5">Fermer</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="label">Unité de travail *</label>
            <input className="input" value={form.work_unit} onChange={e => f('work_unit', e.target.value)} placeholder="Ex: Atelier usinage" />
          </div>
          <div>
            <label className="label">Danger identifié *</label>
            <input className="input" value={form.hazard} onChange={e => f('hazard', e.target.value)} placeholder="Ex: Bruit, produit chimique, chute…" />
          </div>
          <div>
            <label className="label">Description du risque *</label>
            <textarea className="input min-h-[80px]" value={form.risk_description} onChange={e => f('risk_description', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Probabilité (1-5)</label>
              <input type="number" min={1} max={5} className="input" value={form.probability} onChange={e => f('probability', +e.target.value)} />
            </div>
            <div>
              <label className="label">Gravité (1-5)</label>
              <input type="number" min={1} max={5} className="input" value={form.severity} onChange={e => f('severity', +e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Score :</span>
            <span className={`badge ${riskLevel(form.probability * form.severity).color}`}>
              {form.probability * form.severity} — {riskLevel(form.probability * form.severity).label}
            </span>
          </div>
          <div>
            <label className="label">Mesures de prévention</label>
            <textarea className="input min-h-[80px]" value={form.prevention_measures} onChange={e => f('prevention_measures', e.target.value)} />
          </div>
          <div>
            <label className="label">Date de révision</label>
            <input type="date" className="input" value={form.review_date} onChange={e => f('review_date', e.target.value)} />
          </div>
        </div>
        <div className="p-6 border-t flex gap-3">
          <button onClick={save} disabled={upsert.isPending || !form.work_unit || !form.hazard} className="btn-primary flex-1">
            {upsert.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button onClick={onClose} className="btn-secondary">Annuler</button>
        </div>
      </motion.div>
    </div>
  )
}

export default function DuerPage() {
  const { data: items = [], isLoading } = useDuerEvaluations()
  const deleteDuer = useDeleteDuer()
  const canEdit = useIsAtLeast('manager')
  const { organisation } = useOrganisation()
  const [drawer, setDrawer] = useState<Partial<DuerEvaluation> | null | false>(false)

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card animate-pulse h-20 bg-slate-100" />)}</div>
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <button onClick={() => setDrawer({})} className="btn-primary flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Nouvelle évaluation
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card text-center py-12">
          <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Aucune évaluation de risque</p>
          <p className="text-slate-400 text-sm mt-1">Commencez par identifier les unités de travail et leurs dangers.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => {
            const risk = riskLevel(item.risk_score)
            return (
              <motion.div
                key={item.id}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge ${risk.color}`}>{item.risk_score} — {risk.label}</span>
                      <span className="text-xs text-slate-400">{item.work_unit}</span>
                    </div>
                    <p className="font-medium text-slate-900 truncate">{item.hazard}</p>
                    <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{item.risk_description}</p>
                    {item.prevention_measures && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">Prévention : {item.prevention_measures}</p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => setDrawer(item)} className="btn-secondary py-1.5 px-2">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteDuer.mutate(item.id)} className="btn-secondary py-1.5 px-2 text-slate-400 hover:text-danger-600">
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {drawer !== false && (
        <DuerDrawer item={drawer} onClose={() => setDrawer(false)} orgId={organisation?.id ?? ''} />
      )}
    </div>
  )
}
