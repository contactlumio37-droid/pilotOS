import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Shield, AlertTriangle, CheckCircle2, Package, RefreshCw, X } from 'lucide-react'
import { useEpiItems, useEpiAttributions, useUpsertEpiItem, useUpsertEpiAttribution, useRecordEpiControl } from '@/hooks/useSecurity'
import type { EpiItem, EpiAttribution } from '@/hooks/useSecurity'
import { useMemberOptions } from '@/hooks/useMembers'
import { differenceInDays, format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

const EPI_CATEGORIES = ['casque', 'gants', 'chaussures', 'lunettes', 'harnais', 'masque', 'gilet', 'combinaison', 'autre']

const CONDITION_BADGE: Record<string, string> = {
  neuf:  'badge-success',
  bon:   'badge-brand',
  usé:   'badge-warning',
  hs:    'badge-danger',
}

function alertClass(days: number | null): string {
  if (days === null) return ''
  if (days < 0) return 'text-red-400 font-semibold'
  if (days <= 7) return 'text-red-400 font-semibold'
  if (days <= 30) return 'text-amber-400 font-semibold'
  return 'text-slate-400'
}

// ── EpiItem Drawer ────────────────────────────────────────────

function EpiItemDrawer({ item, onClose }: { item: Partial<EpiItem> | null; onClose: () => void }) {
  const upsert = useUpsertEpiItem()
  const [form, setForm] = useState({
    category:         item?.category         ?? 'casque',
    designation:      item?.designation      ?? '',
    reference:        item?.reference        ?? '',
    norm:             item?.norm             ?? '',
    supplier:         item?.supplier         ?? '',
    storage_location: item?.storage_location ?? '',
    renewal_months:   item?.renewal_months   ?? '',
    notes:            item?.notes            ?? '',
  })

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await upsert.mutateAsync({
      ...(item?.id ? { id: item.id } : {}),
      ...form,
      renewal_months: form.renewal_months ? Number(form.renewal_months) : null,
    })
    onClose()
  }

  const inputClass = 'input w-full'

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="w-[420px] bg-white h-full shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">{item?.id ? 'Modifier l\'EPI' : 'Nouvel EPI'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="label">Catégorie</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className={inputClass}>
              {EPI_CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Désignation *</label>
            <input required value={form.designation} onChange={e => set('designation', e.target.value)} className={inputClass} placeholder="Ex: Casque de chantier blanc" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Référence</label>
              <input value={form.reference} onChange={e => set('reference', e.target.value)} className={inputClass} placeholder="REF-001" />
            </div>
            <div>
              <label className="label">Norme</label>
              <input value={form.norm} onChange={e => set('norm', e.target.value)} className={inputClass} placeholder="EN397" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fournisseur</label>
              <input value={form.supplier} onChange={e => set('supplier', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="label">Lieu de stockage</label>
              <input value={form.storage_location} onChange={e => set('storage_location', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="label">Renouvellement (mois)</label>
            <input type="number" min={1} max={120} value={form.renewal_months} onChange={e => set('renewal_months', e.target.value)} className={inputClass} placeholder="Ex: 12" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} className={`${inputClass} resize-none`} />
          </div>
        </form>
        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={e => handleSubmit(e as unknown as React.FormEvent)} disabled={upsert.isPending} className="btn-primary flex-1">
            {upsert.isPending ? 'Sauvegarde…' : 'Enregistrer'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Attribution Drawer ────────────────────────────────────────

function AttributionDrawer({ item, items, onClose }: {
  item: Partial<EpiAttribution> | null
  items: EpiItem[]
  onClose: () => void
}) {
  const upsert = useUpsertEpiAttribution()
  const memberOptions = useMemberOptions()
  const [form, setForm] = useState({
    epi_item_id:       item?.epi_item_id       ?? (items[0]?.id ?? ''),
    user_id:           item?.user_id           ?? '',
    assigned_at:       item?.assigned_at       ?? new Date().toISOString().slice(0, 10),
    quantity:          item?.quantity          ?? 1,
    condition:         item?.condition         ?? 'neuf',
    next_control_date: item?.next_control_date ?? '',
    notes:             item?.notes             ?? '',
  })

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await upsert.mutateAsync({
      ...(item?.id ? { id: item.id } : {}),
      ...form,
      quantity: Number(form.quantity),
      next_control_date: form.next_control_date || null,
    })
    onClose()
  }

  const inputClass = 'input w-full'

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="w-[420px] bg-white h-full shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">{item?.id ? 'Modifier la dotation' : 'Nouvelle dotation'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="label">EPI *</label>
            <select required value={form.epi_item_id} onChange={e => set('epi_item_id', e.target.value)} className={inputClass}>
              <option value="">Sélectionner un EPI…</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.designation}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Bénéficiaire *</label>
            <select required value={form.user_id} onChange={e => set('user_id', e.target.value)} className={inputClass}>
              <option value="">Sélectionner un membre…</option>
              {memberOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date d'attribution</label>
              <input type="date" value={form.assigned_at} onChange={e => set('assigned_at', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="label">Quantité</label>
              <input type="number" min={1} value={form.quantity} onChange={e => set('quantity', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">État</label>
              <select value={form.condition} onChange={e => set('condition', e.target.value)} className={inputClass}>
                <option value="neuf">Neuf</option>
                <option value="bon">Bon</option>
                <option value="usé">Usé</option>
                <option value="hs">Hors service</option>
              </select>
            </div>
            <div>
              <label className="label">Prochain contrôle</label>
              <input type="date" value={form.next_control_date} onChange={e => set('next_control_date', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} className={`${inputClass} resize-none`} />
          </div>
        </form>
        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={e => handleSubmit(e as unknown as React.FormEvent)} disabled={upsert.isPending} className="btn-primary flex-1">
            {upsert.isPending ? 'Sauvegarde…' : 'Enregistrer'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── ControlDrawer ─────────────────────────────────────────────

function ControlDrawer({ attributionId, renewalMonths, onClose }: {
  attributionId: string
  renewalMonths: number | null
  onClose: () => void
}) {
  const recordControl = useRecordEpiControl()
  const defaultNextDate = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() + (renewalMonths ?? 12))
    return d.toISOString().slice(0, 10)
  })()
  const [result, setResult] = useState('ok')
  const [nextDate, setNextDate] = useState(defaultNextDate)

  async function handleSubmit() {
    await recordControl.mutateAsync({ id: attributionId, result, nextControlDate: nextDate })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-[360px] p-6"
      >
        <h2 className="font-semibold text-slate-900 mb-4">Enregistrer un contrôle</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Résultat</label>
            <select value={result} onChange={e => setResult(e.target.value)} className="input w-full">
              <option value="ok">OK — Conforme</option>
              <option value="nok">NOK — Non conforme</option>
              <option value="remplacé">Remplacé</option>
            </select>
          </div>
          <div>
            <label className="label">Prochain contrôle</label>
            <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} className="input w-full" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={handleSubmit} disabled={recordControl.isPending} className="btn-primary flex-1">
            {recordControl.isPending ? 'Sauvegarde…' : 'Valider'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main EpiPage ──────────────────────────────────────────────

type SubTab = 'dotations' | 'catalogue'

export default function EpiPage() {
  const { data: epiItems = [], isLoading: loadingItems } = useEpiItems()
  const { data: attributions = [], isLoading: loadingAttr } = useEpiAttributions()
  const [tab, setTab] = useState<SubTab>('dotations')
  const [itemDrawer, setItemDrawer] = useState<Partial<EpiItem> | null | false>(false)
  const [attrDrawer, setAttrDrawer] = useState<Partial<EpiAttribution> | null | false>(false)
  const [controlId, setControlId] = useState<{ id: string; renewalMonths: number | null } | null>(null)

  const today = new Date()

  const alertCount = attributions.filter(a => {
    if (!a.next_control_date) return false
    const days = differenceInDays(parseISO(a.next_control_date), today)
    return days <= 30
  }).length

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
            <Shield className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">EPI</h1>
            <p className="text-sm text-slate-500">{attributions.length} dotation{attributions.length > 1 ? 's' : ''} actives</p>
          </div>
        </div>
        {alertCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">{alertCount} contrôle{alertCount > 1 ? 's' : ''} à venir</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(['dotations', 'catalogue'] as SubTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'dotations' ? 'Dotations' : 'Catalogue EPI'}
          </button>
        ))}
      </div>

      {/* ── Tab: Dotations ── */}
      {tab === 'dotations' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setAttrDrawer({})} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nouvelle dotation
            </button>
          </div>

          {loadingAttr ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-200 rounded-xl animate-pulse" />)}</div>
          ) : attributions.length === 0 ? (
            <div className="card text-center py-12 text-slate-500">
              <Package className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">Aucune dotation enregistrée</p>
              <p className="text-sm mt-1">Commencez par créer un EPI dans le catalogue, puis attribuez-le à vos collaborateurs.</p>
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-medium">EPI</th>
                    <th className="px-4 py-3 text-left font-medium">Bénéficiaire</th>
                    <th className="px-4 py-3 text-left font-medium">État</th>
                    <th className="px-4 py-3 text-left font-medium">Prochain contrôle</th>
                    <th className="px-4 py-3 text-left font-medium">Dernier contrôle</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attributions.map(a => {
                    const daysUntil = a.next_control_date
                      ? differenceInDays(parseISO(a.next_control_date), today)
                      : null
                    const item = a.epi_items
                    const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles
                    return (
                      <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{item?.designation ?? '—'}</p>
                          <p className="text-xs text-slate-400">{item?.category}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{profile?.full_name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${CONDITION_BADGE[a.condition] ?? 'badge-neutral'}`}>{a.condition}</span>
                        </td>
                        <td className="px-4 py-3">
                          {a.next_control_date ? (
                            <span className={alertClass(daysUntil)}>
                              {format(parseISO(a.next_control_date), 'd MMM yyyy', { locale: fr })}
                              {daysUntil !== null && daysUntil <= 30 && (
                                <span className="ml-1 text-xs">({daysUntil < 0 ? `J+${Math.abs(daysUntil)}` : `J-${daysUntil}`})</span>
                              )}
                            </span>
                          ) : <span className="text-slate-400">Non planifié</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {a.last_control_date ? (
                            <span>{format(parseISO(a.last_control_date), 'd MMM yyyy', { locale: fr })}
                              {a.last_control_result && (
                                <span className={`ml-1.5 badge ${a.last_control_result === 'ok' ? 'badge-success' : a.last_control_result === 'nok' ? 'badge-danger' : 'badge-neutral'}`}>
                                  {a.last_control_result}
                                </span>
                              )}
                            </span>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setControlId({ id: a.id, renewalMonths: item?.renewal_months ?? null })}
                              className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                              title="Enregistrer un contrôle"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setAttrDrawer(a)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Catalogue ── */}
      {tab === 'catalogue' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setItemDrawer({})} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nouvel EPI
            </button>
          </div>

          {loadingItems ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-slate-200 rounded-xl animate-pulse" />)}</div>
          ) : epiItems.length === 0 ? (
            <div className="card text-center py-12 text-slate-500">
              <Shield className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">Aucun EPI dans le catalogue</p>
              <p className="text-sm mt-1">Ajoutez vos premiers équipements de protection individuelle.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {EPI_CATEGORIES.filter(cat => epiItems.some(i => i.category === cat)).map(cat => (
                <div key={cat}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2 px-1">{cat}</p>
                  <div className="card divide-y divide-slate-100 p-0 overflow-hidden">
                    {epiItems.filter(i => i.category === cat).map(item => (
                      <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{item.designation}</p>
                          <p className="text-xs text-slate-400">
                            {[item.reference, item.norm, item.supplier].filter(Boolean).join(' · ')}
                            {item.renewal_months && ` · Renouvellement tous les ${item.renewal_months} mois`}
                          </p>
                        </div>
                        <button onClick={() => setItemDrawer(item)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Modifier</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Drawers */}
      {itemDrawer !== false && (
        <EpiItemDrawer item={itemDrawer} onClose={() => setItemDrawer(false)} />
      )}
      {attrDrawer !== false && (
        <AttributionDrawer item={attrDrawer} items={epiItems} onClose={() => setAttrDrawer(false)} />
      )}
      {controlId && (
        <ControlDrawer
          attributionId={controlId.id}
          renewalMonths={controlId.renewalMonths}
          onClose={() => setControlId(null)}
        />
      )}
    </motion.div>
  )
}
