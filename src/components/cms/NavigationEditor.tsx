import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/useToast'

interface NavItem {
  id: string
  label: string
  url: string
  sort_order: number
  is_visible: boolean
}

export default function NavigationEditor() {
  const qc = useQueryClient()
  const toast = useToast()
  const [newLabel, setNewLabel] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [savingOrder, setSavingOrder] = useState(false)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['cms_nav_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cms_nav_items')
        .select('*')
        .order('sort_order')
      if (error) throw error
      return data as NavItem[]
    },
  })

  const [localItems, setLocalItems] = useState<NavItem[] | null>(null)
  const displayItems = localItems ?? items

  async function handleAdd() {
    if (!newLabel || !newUrl) return
    const { error } = await supabase.from('cms_nav_items').insert({
      label: newLabel,
      url: newUrl,
      sort_order: displayItems.length,
      is_visible: true,
    })
    if (error) { toast.error('Erreur lors de l\'ajout'); return }
    qc.invalidateQueries({ queryKey: ['cms_nav_items'] })
    setNewLabel('')
    setNewUrl('')
    toast.success('Item ajouté')
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('cms_nav_items').delete().eq('id', id)
    if (error) { toast.error('Erreur'); return }
    qc.invalidateQueries({ queryKey: ['cms_nav_items'] })
    toast.success('Item supprimé')
  }

  async function handleToggleVisible(item: NavItem) {
    const { error } = await supabase.from('cms_nav_items').update({ is_visible: !item.is_visible }).eq('id', item.id)
    if (error) { toast.error('Erreur'); return }
    qc.invalidateQueries({ queryKey: ['cms_nav_items'] })
  }

  function moveItem(index: number, dir: -1 | 1) {
    const current = localItems ?? [...items]
    const next = [...current]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setLocalItems(next)
  }

  async function handleSaveOrder() {
    if (!localItems) return
    setSavingOrder(true)
    try {
      await Promise.all(
        localItems.map((item, i) =>
          supabase.from('cms_nav_items').update({ sort_order: i }).eq('id', item.id)
        )
      )
      qc.invalidateQueries({ queryKey: ['cms_nav_items'] })
      setLocalItems(null)
      toast.success('Ordre sauvegardé')
    } catch { toast.error('Erreur lors de la sauvegarde') } finally { setSavingOrder(false) }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h2 className="text-lg font-semibold text-white">Navigation du site</h2>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-slate-800 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-1">
          {displayItems.map((item, i) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3 bg-slate-800 rounded-xl border border-slate-700">
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => moveItem(i, -1)} disabled={i === 0} className="p-1 text-slate-600 hover:text-white disabled:opacity-30 transition-colors">
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => moveItem(i, 1)} disabled={i === displayItems.length - 1} className="p-1 text-slate-600 hover:text-white disabled:opacity-30 transition-colors">
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs text-slate-500">{item.url}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleToggleVisible(item)} className={`p-1.5 rounded-lg transition-colors ${item.is_visible ? 'text-green-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-700'}`}>
                  {item.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-slate-700 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {displayItems.length === 0 && <p className="text-slate-500 text-sm text-center py-8">Aucun item de navigation.</p>}
        </div>
      )}

      {localItems && (
        <button onClick={handleSaveOrder} disabled={savingOrder} className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
          {savingOrder ? 'Sauvegarde…' : 'Sauvegarder l\'ordre'}
        </button>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Ajouter un item</p>
        <div className="flex gap-2">
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Label (ex: Tarifs)" className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="URL (ex: /pricing)" className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <button onClick={handleAdd} disabled={!newLabel || !newUrl} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
