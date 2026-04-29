import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { RoadmapItem, RoadmapStatus, RoadmapCategory } from '@/types/database'

const STATUS_LABELS: Record<RoadmapStatus, string> = {
  shipped:     'Livré',
  in_progress: 'En cours',
  planned:     'Planifié',
  considering: 'En réflexion',
  declined:    'Décliné',
}

const STATUS_COLORS: Record<RoadmapStatus, string> = {
  shipped:     'bg-green-900 text-green-300',
  in_progress: 'bg-blue-900 text-blue-300',
  planned:     'bg-purple-900 text-purple-300',
  considering: 'bg-slate-700 text-slate-300',
  declined:    'bg-red-900 text-red-300',
}

const STATUSES: RoadmapStatus[] = ['in_progress', 'planned', 'considering', 'shipped', 'declined']
const CATEGORIES: RoadmapCategory[] = ['feature', 'improvement', 'fix', 'infrastructure']

const DEFAULT_ITEMS = [
  { title: 'Module Pilotage',  status: 'shipped'     as RoadmapStatus, version_target: 'V0.1', is_public: true, votes: 0, sort_order: 1 },
  { title: 'Module Processus', status: 'shipped'     as RoadmapStatus, version_target: 'V0.2', is_public: true, votes: 0, sort_order: 2 },
  { title: 'Module Terrain',   status: 'in_progress' as RoadmapStatus, version_target: 'V0.3', is_public: true, votes: 0, sort_order: 3 },
  { title: 'GED complète',     status: 'planned'     as RoadmapStatus, version_target: 'V1.0', is_public: true, votes: 0, sort_order: 4 },
  { title: 'Sécurité/QSE',     status: 'considering' as RoadmapStatus, version_target: 'V2.0', is_public: true, votes: 0, sort_order: 5 },
]

interface DraftForm {
  title: string
  description: string
  category: RoadmapCategory | ''
  status: RoadmapStatus
  version_target: string
}

const EMPTY_DRAFT: DraftForm = {
  title: '', description: '', category: '', status: 'planned', version_target: '',
}

export default function RoadmapTab() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState<DraftForm>(EMPTY_DRAFT)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['superadmin_roadmap'],
    queryFn: async () => {
      const { data } = await supabase
        .from('roadmap_items')
        .select('*')
        .order('sort_order')
      if (!data || data.length === 0) {
        await supabase.from('roadmap_items').insert(DEFAULT_ITEMS)
        const { data: seeded } = await supabase
          .from('roadmap_items')
          .select('*')
          .order('sort_order')
        return (seeded ?? []) as RoadmapItem[]
      }
      return data as RoadmapItem[]
    },
  })

  const addItem = useMutation({
    mutationFn: async (d: DraftForm) => {
      const { error } = await supabase.from('roadmap_items').insert({
        title: d.title,
        description: d.description || null,
        category: d.category || null,
        status: d.status,
        version_target: d.version_target || null,
        is_public: true,
        votes: 0,
        sort_order: items.length + 1,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['superadmin_roadmap'] })
      setShowForm(false)
      setDraft(EMPTY_DRAFT)
    },
  })

  const togglePublic = useMutation({
    mutationFn: async ({ id, is_public }: { id: string; is_public: boolean }) => {
      const { error } = await supabase.from('roadmap_items').update({ is_public }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin_roadmap'] }),
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RoadmapStatus }) => {
      const { error } = await supabase.from('roadmap_items').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin_roadmap'] }),
  })

  if (isLoading) {
    return <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-800 rounded-xl animate-pulse" />)}</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Roadmap</h2>
          <p className="text-slate-400 text-sm">{items.length} éléments</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 text-sm px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Nouvel élément roadmap</h3>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Titre *</label>
              <input
                value={draft.title}
                onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Ex: Module GED avancé"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Version cible</label>
              <input
                value={draft.version_target}
                onChange={e => setDraft(d => ({ ...d, version_target: e.target.value }))}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="V1.2"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Description</label>
            <textarea
              value={draft.description}
              onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
              rows={2}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Statut</label>
              <select
                value={draft.status}
                onChange={e => setDraft(d => ({ ...d, status: e.target.value as RoadmapStatus }))}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Catégorie</label>
              <select
                value={draft.category}
                onChange={e => setDraft(d => ({ ...d, category: e.target.value as RoadmapCategory | '' }))}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">— Sans catégorie —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <button
            onClick={() => draft.title && addItem.mutate(draft)}
            disabled={!draft.title || addItem.isPending}
            className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {addItem.isPending ? 'Ajout…' : 'Ajouter'}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-4 bg-slate-800 rounded-xl px-5 py-3 border border-slate-700">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[item.status]}`}>
              {STATUS_LABELS[item.status]}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{item.title}</p>
              {item.version_target && <p className="text-xs text-slate-500">{item.version_target}</p>}
            </div>
            <select
              value={item.status}
              onChange={e => updateStatus.mutate({ id: item.id, status: e.target.value as RoadmapStatus })}
              className="text-xs bg-slate-700 border border-slate-600 text-white rounded px-2 py-1 focus:outline-none"
            >
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <button
              onClick={() => togglePublic.mutate({ id: item.id, is_public: !item.is_public })}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                item.is_public
                  ? 'border-green-700 text-green-400'
                  : 'border-slate-600 text-slate-500'
              }`}
            >
              {item.is_public ? 'Public' : 'Privé'}
            </button>
            <span className="text-xs text-slate-500 shrink-0">👍 {item.votes}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
