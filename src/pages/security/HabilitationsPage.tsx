import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, GraduationCap, AlertTriangle, X } from 'lucide-react'
import {
  useHabilitations,
  useHabilitationAttributions,
  useUpsertHabilitation,
  useUpsertHabAttribution,
} from '@/hooks/useSecurity'
import type { Habilitation, HabilitationAttribution } from '@/hooks/useSecurity'
import { useMemberOptions } from '@/hooks/useMembers'
import { differenceInDays, format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

const HAB_CATEGORIES = [
  { value: 'caces',      label: 'CACES' },
  { value: 'electrique', label: 'Électrique' },
  { value: 'chimique',   label: 'Chimique' },
  { value: 'hauteur',    label: 'Travail en hauteur' },
  { value: 'sst',        label: 'SST / Secourisme' },
  { value: 'autre',      label: 'Autre' },
]

const STATUS_BADGE: Record<string, string> = {
  active:    'badge-success',
  expired:   'badge-danger',
  suspended: 'badge-warning',
}

const STATUS_LABEL: Record<string, string> = {
  active:    'Valide',
  expired:   'Expirée',
  suspended: 'Suspendue',
}

function urgencyClass(days: number | null): string {
  if (days === null) return 'text-slate-400'
  if (days < 0) return 'text-red-500 font-semibold'
  if (days <= 7) return 'text-red-400 font-semibold'
  if (days <= 30) return 'text-amber-500 font-semibold'
  if (days <= 60) return 'text-amber-400'
  return 'text-slate-500'
}

// ── Habilitation type Drawer ──────────────────────────────────

function HabTypeDrawer({ hab, onClose }: { hab: Partial<Habilitation> | null; onClose: () => void }) {
  const upsert = useUpsertHabilitation()
  const [form, setForm] = useState({
    code:               hab?.code               ?? '',
    label:              hab?.label              ?? '',
    category:           hab?.category           ?? 'caces',
    description:        hab?.description        ?? '',
    validity_months:    hab?.validity_months    ?? '',
    renewal_delay_days: hab?.renewal_delay_days ?? 60,
  })

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await upsert.mutateAsync({
      ...(hab?.id ? { id: hab.id } : {}),
      ...form,
      validity_months:    form.validity_months    ? Number(form.validity_months)    : null,
      renewal_delay_days: Number(form.renewal_delay_days),
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
          <h2 className="font-semibold text-slate-900">{hab?.id ? 'Modifier l\'habilitation' : 'Nouvelle habilitation'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="label">Catégorie</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className={inputClass}>
              {HAB_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Code *</label>
              <input required value={form.code} onChange={e => set('code', e.target.value)} className={inputClass} placeholder="CACES R489-3" />
            </div>
            <div>
              <label className="label">Libellé *</label>
              <input required value={form.label} onChange={e => set('label', e.target.value)} className={inputClass} placeholder="Chariot élévateur" />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} className={`${inputClass} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Validité (mois)</label>
              <input type="number" min={1} value={form.validity_months} onChange={e => set('validity_months', e.target.value)} className={inputClass} placeholder="36 — vide = illimité" />
            </div>
            <div>
              <label className="label">Alerte avant expiration (j)</label>
              <input type="number" min={7} max={365} value={form.renewal_delay_days} onChange={e => set('renewal_delay_days', e.target.value)} className={inputClass} />
            </div>
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

function HabAttributionDrawer({ attr, habilitations, onClose }: {
  attr: Partial<HabilitationAttribution> | null
  habilitations: Habilitation[]
  onClose: () => void
}) {
  const upsert = useUpsertHabAttribution()
  const memberOptions = useMemberOptions()

  const selectedHab = habilitations.find(h => h.id === attr?.habilitation_id)

  const defaultExpiry = (() => {
    if (attr?.expires_at) return attr.expires_at
    if (selectedHab?.validity_months) {
      const d = new Date()
      d.setMonth(d.getMonth() + selectedHab.validity_months)
      return d.toISOString().slice(0, 10)
    }
    return ''
  })()

  const [form, setForm] = useState({
    habilitation_id: attr?.habilitation_id ?? (habilitations[0]?.id ?? ''),
    user_id:         attr?.user_id         ?? '',
    issued_at:       attr?.issued_at       ?? new Date().toISOString().slice(0, 10),
    expires_at:      defaultExpiry,
    issuer:          attr?.issuer          ?? '',
    certificate_url: attr?.certificate_url ?? '',
    status:          attr?.status          ?? 'active',
    notes:           attr?.notes           ?? '',
  })

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })) }

  function handleHabChange(habId: string) {
    set('habilitation_id', habId)
    const h = habilitations.find(h => h.id === habId)
    if (h?.validity_months && !attr?.expires_at) {
      const d = new Date(form.issued_at || new Date())
      d.setMonth(d.getMonth() + h.validity_months)
      set('expires_at', d.toISOString().slice(0, 10))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await upsert.mutateAsync({
      ...(attr?.id ? { id: attr.id } : {}),
      ...form,
      expires_at: form.expires_at || null,
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
          <h2 className="font-semibold text-slate-900">{attr?.id ? 'Modifier l\'affectation' : 'Nouvelle affectation'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="label">Habilitation *</label>
            <select required value={form.habilitation_id} onChange={e => handleHabChange(e.target.value)} className={inputClass}>
              <option value="">Sélectionner une habilitation…</option>
              {habilitations.map(h => <option key={h.id} value={h.id}>{h.code} — {h.label}</option>)}
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
              <label className="label">Date d'émission *</label>
              <input type="date" required value={form.issued_at} onChange={e => set('issued_at', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="label">Date d'expiration</label>
              <input type="date" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} className={inputClass} />
              <p className="text-xs text-slate-400 mt-0.5">Vide = illimitée</p>
            </div>
          </div>
          <div>
            <label className="label">Organisme émetteur</label>
            <input value={form.issuer} onChange={e => set('issuer', e.target.value)} className={inputClass} placeholder="CRAM, OPPBTP…" />
          </div>
          <div>
            <label className="label">URL du justificatif</label>
            <input type="url" value={form.certificate_url} onChange={e => set('certificate_url', e.target.value)} className={inputClass} placeholder="https://…" />
          </div>
          {attr?.id && (
            <div>
              <label className="label">Statut</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inputClass}>
                <option value="active">Valide</option>
                <option value="suspended">Suspendue</option>
                <option value="expired">Expirée</option>
              </select>
            </div>
          )}
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

// ── Main HabilitationsPage ────────────────────────────────────

type SubTab = 'affectations' | 'catalogue'

export default function HabilitationsPage() {
  const { data: habilitations = [], isLoading: loadingHabs } = useHabilitations()
  const { data: attributions = [], isLoading: loadingAttr } = useHabilitationAttributions()
  const [tab, setTab] = useState<SubTab>('affectations')
  const [habDrawer, setHabDrawer] = useState<Partial<Habilitation> | null | false>(false)
  const [attrDrawer, setAttrDrawer] = useState<Partial<HabilitationAttribution> | null | false>(false)

  const today = new Date()

  const expiringCount = attributions.filter(a => {
    if (a.status !== 'active' || !a.expires_at) return false
    const days = differenceInDays(parseISO(a.expires_at), today)
    return days <= 60
  }).length

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Habilitations</h1>
            <p className="text-sm text-slate-500">{attributions.filter(a => a.status === 'active').length} habilitation{attributions.length > 1 ? 's' : ''} actives</p>
          </div>
        </div>
        {expiringCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">{expiringCount} expir{expiringCount > 1 ? 'ent' : 'e'} dans 60 jours</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(['affectations', 'catalogue'] as SubTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'affectations' ? 'Affectations' : 'Catalogue'}
          </button>
        ))}
      </div>

      {/* ── Tab: Affectations ── */}
      {tab === 'affectations' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setAttrDrawer({})} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nouvelle affectation
            </button>
          </div>

          {loadingAttr ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-200 rounded-xl animate-pulse" />)}</div>
          ) : attributions.length === 0 ? (
            <div className="card text-center py-12 text-slate-500">
              <GraduationCap className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">Aucune habilitation affectée</p>
              <p className="text-sm mt-1">Créez d'abord les types d'habilitation dans le catalogue, puis affectez-les à vos collaborateurs.</p>
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-medium">Habilitation</th>
                    <th className="px-4 py-3 text-left font-medium">Bénéficiaire</th>
                    <th className="px-4 py-3 text-left font-medium">Statut</th>
                    <th className="px-4 py-3 text-left font-medium">Émise le</th>
                    <th className="px-4 py-3 text-left font-medium">Expiration</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attributions.map(a => {
                    const daysUntil = a.expires_at
                      ? differenceInDays(parseISO(a.expires_at), today)
                      : null
                    const hab = Array.isArray(a.habilitations) ? a.habilitations[0] : a.habilitations
                    const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles
                    return (
                      <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{hab?.code ?? '—'}</p>
                          <p className="text-xs text-slate-400">{hab?.label}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{profile?.full_name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${STATUS_BADGE[a.status] ?? 'badge-neutral'}`}>
                            {STATUS_LABEL[a.status] ?? a.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {format(parseISO(a.issued_at), 'd MMM yyyy', { locale: fr })}
                        </td>
                        <td className="px-4 py-3">
                          {a.expires_at ? (
                            <span className={urgencyClass(daysUntil)}>
                              {format(parseISO(a.expires_at), 'd MMM yyyy', { locale: fr })}
                              {daysUntil !== null && daysUntil <= 60 && (
                                <span className="ml-1 text-xs">
                                  {daysUntil < 0 ? `(expiré)` : `(J-${daysUntil})`}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400">Illimitée</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setAttrDrawer(a)}
                            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                          >
                            Modifier
                          </button>
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
            <button onClick={() => setHabDrawer({})} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nouvelle habilitation
            </button>
          </div>

          {loadingHabs ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-slate-200 rounded-xl animate-pulse" />)}</div>
          ) : habilitations.length === 0 ? (
            <div className="card text-center py-12 text-slate-500">
              <GraduationCap className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">Catalogue vide</p>
              <p className="text-sm mt-1">Ajoutez les types d'habilitations requises dans votre organisation (CACES, B0, H0V…).</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {HAB_CATEGORIES.filter(cat => habilitations.some(h => h.category === cat.value)).map(cat => (
                <div key={cat.value}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2 px-1">{cat.label}</p>
                  <div className="card divide-y divide-slate-100 p-0 overflow-hidden">
                    {habilitations.filter(h => h.category === cat.value).map(hab => (
                      <div key={hab.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{hab.code} — {hab.label}</p>
                          <p className="text-xs text-slate-400">
                            {hab.validity_months ? `Validité ${hab.validity_months} mois` : 'Validité illimitée'}
                            {' · '}Alerte J-{hab.renewal_delay_days}
                          </p>
                        </div>
                        <button onClick={() => setHabDrawer(hab)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Modifier</button>
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
      {habDrawer !== false && (
        <HabTypeDrawer hab={habDrawer} onClose={() => setHabDrawer(false)} />
      )}
      {attrDrawer !== false && (
        <HabAttributionDrawer attr={attrDrawer} habilitations={habilitations} onClose={() => setAttrDrawer(false)} />
      )}
    </motion.div>
  )
}
