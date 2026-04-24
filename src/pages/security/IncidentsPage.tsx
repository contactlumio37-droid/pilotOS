import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, AlertTriangle, CheckCircle } from 'lucide-react'
import { useIncidents, useUpsertIncident } from '@/hooks/useSecurity'
import type { Incident } from '@/hooks/useSecurity'
import { useOrganisation } from '@/hooks/useOrganisation'
import { useAuth } from '@/hooks/useAuth'

const TYPE_LABEL: Record<Incident['incident_type'], { label: string; color: string }> = {
  accident:           { label: 'Accident du travail', color: 'badge-danger'   },
  near_miss:          { label: "Presqu'accident",     color: 'badge-warning'  },
  dangerous_situation:{ label: 'Situation dangereuse', color: 'badge-warning' },
  first_aid:          { label: 'Premiers secours',    color: 'badge-neutral'  },
}

const STATUS_LABEL: Record<Incident['status'], { label: string; color: string }> = {
  open:               { label: 'Ouvert',           color: 'badge-danger'   },
  under_analysis:     { label: 'Analyse en cours', color: 'badge-warning'  },
  action_in_progress: { label: 'Action en cours',  color: 'badge-brand'    },
  closed:             { label: 'Clôturé',          color: 'badge-success'  },
}

interface DrawerProps {
  item: Partial<Incident> | null
  onClose: () => void
}

function IncidentDrawer({ item, onClose }: DrawerProps) {
  const upsert = useUpsertIncident()
  const { organisation } = useOrganisation()
  const { user } = useAuth()
  const isEdit = !!item?.id

  const [form, setForm] = useState({
    incident_type:        item?.incident_type        ?? 'near_miss' as Incident['incident_type'],
    title:                item?.title                ?? '',
    description:          item?.description          ?? '',
    occurred_at:          item?.occurred_at          ?? new Date().toISOString().slice(0, 16),
    location:             item?.location             ?? '',
    root_causes:          item?.root_causes          ?? '',
    contributing_factors: item?.contributing_factors ?? '',
    status:               item?.status               ?? 'open' as Incident['status'],
  })

  async function save() {
    await upsert.mutateAsync({
      ...form,
      id:              item?.id,
      organisation_id: organisation!.id,
      declared_by:     item?.declared_by ?? user?.id,
    } as Parameters<typeof upsert.mutateAsync>[0])
    onClose()
  }

  const f = (field: keyof typeof form, val: string) => setForm(p => ({ ...p, [field]: val }))

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full max-w-lg bg-white shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-semibold text-slate-900">{isEdit ? 'Modifier l\'incident' : 'Déclarer un incident'}</h2>
          <button onClick={onClose} className="btn-secondary text-sm py-1.5">Fermer</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="label">Type d&apos;incident *</label>
            <select className="input" value={form.incident_type} onChange={e => f('incident_type', e.target.value)}>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Titre *</label>
            <input className="input" value={form.title} onChange={e => f('title', e.target.value)} placeholder="Description courte de l'incident" />
          </div>
          <div>
            <label className="label">Date et heure *</label>
            <input type="datetime-local" className="input" value={form.occurred_at} onChange={e => f('occurred_at', e.target.value)} />
          </div>
          <div>
            <label className="label">Lieu</label>
            <input className="input" value={form.location} onChange={e => f('location', e.target.value)} placeholder="Atelier, site, bâtiment…" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-[80px]" value={form.description} onChange={e => f('description', e.target.value)} />
          </div>
          <div>
            <label className="label">Causes racines</label>
            <textarea className="input min-h-[60px]" value={form.root_causes} onChange={e => f('root_causes', e.target.value)} placeholder="Pourquoi cela s'est-il produit ?" />
          </div>
          <div>
            <label className="label">Facteurs contributifs</label>
            <textarea className="input min-h-[60px]" value={form.contributing_factors} onChange={e => f('contributing_factors', e.target.value)} />
          </div>
          {isEdit && (
            <div>
              <label className="label">Statut</label>
              <select className="input" value={form.status} onChange={e => f('status', e.target.value)}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="p-6 border-t flex gap-3">
          <button onClick={save} disabled={upsert.isPending || !form.title} className="btn-primary flex-1">
            {upsert.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button onClick={onClose} className="btn-secondary">Annuler</button>
        </div>
      </motion.div>
    </div>
  )
}

export default function IncidentsPage() {
  const { data: incidents = [], isLoading } = useIncidents()
  const [drawer, setDrawer] = useState<Partial<Incident> | null | false>(false)
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('open')

  const filtered = incidents.filter(i => {
    if (filter === 'open')   return i.status !== 'closed'
    if (filter === 'closed') return i.status === 'closed'
    return true
  })

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card animate-pulse h-20 bg-slate-100" />)}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(['open', 'closed', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === f ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {f === 'open' ? 'En cours' : f === 'closed' ? 'Clôturés' : 'Tous'}
            </button>
          ))}
        </div>
        <button onClick={() => setDrawer({})} className="btn-primary flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Déclarer
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <CheckCircle className="w-10 h-10 text-success-400 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Aucun incident {filter === 'open' ? 'en cours' : filter === 'closed' ? 'clôturé' : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((incident, i) => {
            const type   = TYPE_LABEL[incident.incident_type]
            const status = STATUS_LABEL[incident.status]
            return (
              <motion.div
                key={incident.id}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="card card-hover cursor-pointer"
                onClick={() => setDrawer(incident)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge ${type.color}`}>{type.label}</span>
                      <span className={`badge ${status.color}`}>{status.label}</span>
                    </div>
                    <p className="font-medium text-slate-900 truncate">{incident.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(incident.occurred_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {incident.location && ` — ${incident.location}`}
                    </p>
                  </div>
                  <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${incident.incident_type === 'accident' ? 'text-danger-500' : 'text-amber-400'}`} />
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {drawer !== false && (
        <IncidentDrawer item={drawer} onClose={() => setDrawer(false)} />
      )}
    </div>
  )
}
