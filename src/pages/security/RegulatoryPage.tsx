import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, FileText, AlertCircle } from 'lucide-react'
import { useRegulatoryRegister, useUpsertRegulatory } from '@/hooks/useSecurity'
import type { RegulatoryItem } from '@/hooks/useSecurity'
import { useOrganisation } from '@/hooks/useOrganisation'

const CATEGORY_LABEL: Record<RegulatoryItem['category'], string> = {
  inspection: 'Contrôle / inspection',
  training:   'Formation',
  document:   'Document',
  equipment:  'Équipement',
  other:      'Autre',
}

const STATUS_CONFIG: Record<RegulatoryItem['status'], { label: string; color: string }> = {
  ok:       { label: 'À jour',       color: 'badge-success' },
  due_soon: { label: 'Bientôt dû',   color: 'badge-warning' },
  overdue:  { label: 'En retard',    color: 'badge-danger'  },
  na:       { label: 'N/A',          color: 'badge-neutral' },
}

interface DrawerProps {
  item: Partial<RegulatoryItem> | null
  onClose: () => void
}

function RegulatoryDrawer({ item, onClose }: DrawerProps) {
  const upsert = useUpsertRegulatory()
  const { organisation } = useOrganisation()

  const [form, setForm] = useState({
    obligation:      item?.obligation      ?? '',
    legal_reference: item?.legal_reference ?? '',
    category:        item?.category        ?? 'other' as RegulatoryItem['category'],
    frequency:       item?.frequency       ?? '',
    due_date:        item?.due_date        ?? '',
    last_done_at:    item?.last_done_at    ?? '',
    status:          item?.status          ?? 'ok' as RegulatoryItem['status'],
    notes:           item?.notes           ?? '',
  })

  async function save() {
    await upsert.mutateAsync({
      ...form,
      id:              item?.id,
      organisation_id: organisation!.id,
      due_date:        form.due_date     || null,
      last_done_at:    form.last_done_at || null,
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
          <h2 className="font-semibold text-slate-900">{item?.id ? 'Modifier l\'obligation' : 'Nouvelle obligation'}</h2>
          <button onClick={onClose} className="btn-secondary text-sm py-1.5">Fermer</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="label">Obligation *</label>
            <input className="input" value={form.obligation} onChange={e => f('obligation', e.target.value)} placeholder="Ex: Vérification extincteurs" />
          </div>
          <div>
            <label className="label">Référence légale</label>
            <input className="input" value={form.legal_reference} onChange={e => f('legal_reference', e.target.value)} placeholder="Ex: Art. R4224-17 Code du travail" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Catégorie</label>
              <select className="input" value={form.category} onChange={e => f('category', e.target.value)}>
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Fréquence</label>
              <input className="input" value={form.frequency} onChange={e => f('frequency', e.target.value)} placeholder="Ex: Annuel" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Prochaine échéance</label>
              <input type="date" className="input" value={form.due_date} onChange={e => f('due_date', e.target.value)} />
            </div>
            <div>
              <label className="label">Dernière réalisation</label>
              <input type="date" className="input" value={form.last_done_at} onChange={e => f('last_done_at', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Statut</label>
            <select className="input" value={form.status} onChange={e => f('status', e.target.value)}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input min-h-[60px]" value={form.notes} onChange={e => f('notes', e.target.value)} />
          </div>
        </div>
        <div className="p-6 border-t flex gap-3">
          <button onClick={save} disabled={upsert.isPending || !form.obligation} className="btn-primary flex-1">
            {upsert.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button onClick={onClose} className="btn-secondary">Annuler</button>
        </div>
      </motion.div>
    </div>
  )
}

export default function RegulatoryPage() {
  const { data: items = [], isLoading } = useRegulatoryRegister()
  const [drawer, setDrawer] = useState<Partial<RegulatoryItem> | null | false>(false)

  const overdue  = items.filter(i => i.status === 'overdue')
  const dueSoon  = items.filter(i => i.status === 'due_soon')
  const ok       = items.filter(i => i.status === 'ok' || i.status === 'na')

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card animate-pulse h-16 bg-slate-100" />)}</div>
  }

  function renderGroup(title: string, list: RegulatoryItem[], delay = 0) {
    if (list.length === 0) return null
    return (
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">{title}</h3>
        <div className="space-y-2">
          {list.map((item, i) => {
            const st = STATUS_CONFIG[item.status]
            return (
              <motion.div
                key={item.id}
                initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: delay + i * 0.03 }}
                className="card card-hover cursor-pointer"
                onClick={() => setDrawer(item)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`badge ${st.color} text-xs`}>{st.label}</span>
                      <span className="text-xs text-slate-400">{CATEGORY_LABEL[item.category]}</span>
                    </div>
                    <p className="font-medium text-slate-900 truncate">{item.obligation}</p>
                    {item.legal_reference && <p className="text-xs text-slate-400 mt-0.5">{item.legal_reference}</p>}
                    {item.due_date && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Échéance : {new Date(item.due_date).toLocaleDateString('fr-FR')}
                        {item.frequency && ` — ${item.frequency}`}
                      </p>
                    )}
                  </div>
                  {item.status === 'overdue' && <AlertCircle className="w-4 h-4 text-danger-500 shrink-0 mt-1" />}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setDrawer({})} className="btn-primary flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Ajouter une obligation
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Registre vide</p>
          <p className="text-slate-400 text-sm mt-1">Ajoutez vos obligations réglementaires pour suivre leurs échéances.</p>
        </div>
      ) : (
        <>
          {renderGroup('En retard', overdue, 0)}
          {renderGroup('Bientôt dû', dueSoon, 0.1)}
          {renderGroup('À jour', ok, 0.2)}
        </>
      )}

      {drawer !== false && (
        <RegulatoryDrawer item={drawer} onClose={() => setDrawer(false)} />
      )}
    </div>
  )
}
