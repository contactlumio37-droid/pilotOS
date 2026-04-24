import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, CalendarDays, CheckCircle2 } from 'lucide-react'
import { useSafetyVisits, useUpsertSafetyVisit } from '@/hooks/useSecurity'
import type { SafetyVisit } from '@/hooks/useSecurity'
import { useOrganisation } from '@/hooks/useOrganisation'

const VISIT_TYPE_LABEL: Record<SafetyVisit['visit_type'], string> = {
  planned:     'Planifiée',
  unannounced: 'Inopinée',
  audit:       'Audit',
  inspection:  'Inspection',
}

const STATUS_COLOR: Record<SafetyVisit['status'], string> = {
  planned:   'badge-brand',
  completed: 'badge-success',
  cancelled: 'badge-neutral',
}

interface DrawerProps {
  item: Partial<SafetyVisit> | null
  onClose: () => void
}

function VisitDrawer({ item, onClose }: DrawerProps) {
  const upsert = useUpsertSafetyVisit()
  const { organisation } = useOrganisation()

  const [form, setForm] = useState({
    visit_type:   item?.visit_type   ?? 'planned' as SafetyVisit['visit_type'],
    planned_at:   item?.planned_at   ?? new Date().toISOString().slice(0, 10),
    conducted_at: item?.conducted_at ?? '',
    scope:        item?.scope        ?? '',
    observations: item?.observations ?? '',
    status:       item?.status       ?? 'planned' as SafetyVisit['status'],
  })

  async function save() {
    await upsert.mutateAsync({
      ...form,
      id:              item?.id,
      organisation_id: organisation!.id,
      conducted_at:    form.conducted_at || null,
    } as Parameters<typeof upsert.mutateAsync>[0])
    onClose()
  }

  const f = (field: keyof typeof form, val: string) => setForm(p => ({ ...p, [field]: val }))

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full max-w-lg bg-white shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-semibold text-slate-900">{item?.id ? 'Modifier la visite' : 'Nouvelle visite'}</h2>
          <button onClick={onClose} className="btn-secondary text-sm py-1.5">Fermer</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="label">Type de visite</label>
            <select className="input" value={form.visit_type} onChange={e => f('visit_type', e.target.value)}>
              {Object.entries(VISIT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date planifiée *</label>
              <input type="date" className="input" value={form.planned_at} onChange={e => f('planned_at', e.target.value)} />
            </div>
            <div>
              <label className="label">Date réalisée</label>
              <input type="date" className="input" value={form.conducted_at} onChange={e => f('conducted_at', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Périmètre inspecté</label>
            <input className="input" value={form.scope} onChange={e => f('scope', e.target.value)} placeholder="Zone, atelier, process…" />
          </div>
          <div>
            <label className="label">Observations</label>
            <textarea className="input min-h-[100px]" value={form.observations} onChange={e => f('observations', e.target.value)} />
          </div>
          <div>
            <label className="label">Statut</label>
            <select className="input" value={form.status} onChange={e => f('status', e.target.value)}>
              <option value="planned">Planifiée</option>
              <option value="completed">Réalisée</option>
              <option value="cancelled">Annulée</option>
            </select>
          </div>
        </div>
        <div className="p-6 border-t flex gap-3">
          <button onClick={save} disabled={upsert.isPending || !form.planned_at} className="btn-primary flex-1">
            {upsert.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button onClick={onClose} className="btn-secondary">Annuler</button>
        </div>
      </motion.div>
    </div>
  )
}

export default function SafetyVisitsPage() {
  const { data: visits = [], isLoading } = useSafetyVisits()
  const [drawer, setDrawer] = useState<Partial<SafetyVisit> | null | false>(false)

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card animate-pulse h-20 bg-slate-100" />)}</div>
  }

  const upcoming = visits.filter(v => v.status === 'planned')
  const past     = visits.filter(v => v.status !== 'planned')

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setDrawer({})} className="btn-primary flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Planifier une visite
        </button>
      </div>

      {visits.length === 0 ? (
        <div className="card text-center py-12">
          <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Aucune visite planifiée</p>
          <p className="text-slate-400 text-sm mt-1">Planifiez des inspections terrain régulières pour prévenir les risques.</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">À venir</h3>
              <div className="space-y-3">
                {upcoming.map((v, i) => (
                  <motion.div
                    key={v.id}
                    initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="card card-hover cursor-pointer"
                    onClick={() => setDrawer(v)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`badge ${STATUS_COLOR[v.status]}`}>{VISIT_TYPE_LABEL[v.visit_type]}</span>
                        </div>
                        <p className="text-sm text-slate-600">{new Date(v.planned_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        {v.scope && <p className="text-xs text-slate-400 mt-0.5">{v.scope}</p>}
                      </div>
                      <CalendarDays className="w-5 h-5 text-brand-400" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Historique</h3>
              <div className="space-y-3">
                {past.map((v, i) => (
                  <motion.div
                    key={v.id}
                    initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="card card-hover cursor-pointer"
                    onClick={() => setDrawer(v)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`badge ${STATUS_COLOR[v.status]}`}>{v.status === 'completed' ? 'Réalisée' : 'Annulée'}</span>
                          <span className="text-xs text-slate-400">{VISIT_TYPE_LABEL[v.visit_type]}</span>
                        </div>
                        <p className="text-sm text-slate-600">{new Date(v.planned_at).toLocaleDateString('fr-FR')}</p>
                        {v.observations && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{v.observations}</p>}
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-success-400" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {drawer !== false && (
        <VisitDrawer item={drawer} onClose={() => setDrawer(false)} />
      )}
    </div>
  )
}
