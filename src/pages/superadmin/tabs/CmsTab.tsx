import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  FileText, Navigation, Search as SearchIcon, Plus, Globe, Trash2, Edit3,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/useToast'
import PageEditor from '@/components/cms/PageEditor'
import NavigationEditor from '@/components/cms/NavigationEditor'
import SeoGlobalEditor from '@/components/cms/SeoGlobalEditor'
import type { CmsPage } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────

type CmsMainTab = 'pages' | 'navigation' | 'seo'

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ── Hooks ─────────────────────────────────────────────────────

function useCmsPages() {
  return useQuery({
    queryKey: ['cms_pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cms_pages')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as CmsPage[]
    },
  })
}

// ── New Page Modal ────────────────────────────────────────────

function NewPageModal({ onClose, onCreate }: { onClose: () => void; onCreate: (page: CmsPage) => void }) {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [creating, setCreating] = useState(false)
  const toast = useToast()
  const qc = useQueryClient()

  function handleTitleChange(v: string) {
    setTitle(v)
    setSlug(slugify(v))
  }

  async function handleCreate() {
    if (!title || !slug) return
    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('cms_pages')
        .insert({ title, slug, sections: [], published: false })
        .select()
        .single()
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['cms_pages'] })
      toast.success('Page créée')
      onCreate(data as CmsPage)
    } catch { toast.error('Erreur lors de la création (slug déjà utilisé ?)') } finally { setCreating(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
        <h3 className="text-white font-semibold">Nouvelle page</h3>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Titre *</label>
          <input
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="À propos"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Slug URL</label>
          <input
            value={slug}
            onChange={e => setSlug(e.target.value)}
            placeholder="a-propos"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-[10px] text-slate-500 mt-1">/slug</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors">Annuler</button>
          <button onClick={handleCreate} disabled={creating || !title || !slug} className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
            {creating ? 'Création…' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Pages Tab ─────────────────────────────────────────────────

function PagesTab({ onEditPage }: { onEditPage: (page: CmsPage) => void }) {
  const { data: pages = [], isLoading } = useCmsPages()
  const qc = useQueryClient()
  const toast = useToast()
  const [showNew, setShowNew] = useState(false)

  async function handleTogglePublish(page: CmsPage) {
    const { error } = await supabase
      .from('cms_pages')
      .update({ published: !page.published, updated_at: new Date().toISOString() })
      .eq('id', page.id)
    if (error) { toast.error('Erreur'); return }
    qc.invalidateQueries({ queryKey: ['cms_pages'] })
    toast.success(page.published ? 'Page dépubliée' : 'Page publiée')
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette page ?')) return
    const { error } = await supabase.from('cms_pages').delete().eq('id', id)
    if (error) { toast.error('Erreur lors de la suppression'); return }
    qc.invalidateQueries({ queryKey: ['cms_pages'] })
    toast.success('Page supprimée')
  }

  const homePage: CmsPage = {
    id: 'home',
    slug: 'home',
    title: 'Accueil (home)',
    seo_title: null,
    seo_description: null,
    og_image: null,
    sections: [],
    published: true,
    created_at: '',
    updated_at: '',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Pages CMS</h2>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvelle page
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-14 bg-slate-800 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {/* Home page row (non-deletable) */}
          <div className="flex items-center gap-4 px-5 py-4 bg-slate-800 rounded-xl border border-slate-700">
            <FileText className="w-4 h-4 text-slate-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Accueil</p>
              <p className="text-xs text-slate-500">/home (sections site_sections)</p>
            </div>
            <span className="badge badge-success text-xs">Publié</span>
            <button onClick={() => onEditPage(homePage)} className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:border-brand-500 hover:text-brand-400 transition-colors flex items-center gap-1">
              <Edit3 className="w-3 h-3" />
              Éditer
            </button>
          </div>

          {/* Custom pages */}
          {pages.map(page => (
            <div key={page.id} className="flex items-center gap-4 px-5 py-4 bg-slate-800 rounded-xl border border-slate-700">
              <FileText className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{page.title}</p>
                <p className="text-xs text-slate-500">/{page.slug} · {new Date(page.updated_at).toLocaleDateString('fr-FR')}</p>
              </div>
              <span className={`badge text-xs ${page.published ? 'badge-success' : 'badge-neutral'}`}>
                {page.published ? 'Publié' : 'Brouillon'}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onEditPage(page)} className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:border-brand-500 hover:text-brand-400 transition-colors flex items-center gap-1">
                  <Edit3 className="w-3 h-3" />
                  Éditer
                </button>
                <button
                  onClick={() => handleTogglePublish(page)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:border-green-500 hover:text-green-400 transition-colors flex items-center gap-1"
                >
                  <Globe className="w-3 h-3" />
                  {page.published ? 'Dépublier' : 'Publier'}
                </button>
                <button onClick={() => handleDelete(page.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-slate-700 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {pages.length === 0 && (
            <p className="text-center text-slate-500 py-8 text-sm">Aucune page custom. Créez votre première page.</p>
          )}
        </div>
      )}

      {showNew && (
        <NewPageModal
          onClose={() => setShowNew(false)}
          onCreate={page => { setShowNew(false); onEditPage(page) }}
        />
      )}
    </div>
  )
}

// ── Main CmsTab ───────────────────────────────────────────────

const TABS: { id: CmsMainTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'pages',      label: 'Pages',      icon: FileText },
  { id: 'navigation', label: 'Navigation', icon: Navigation },
  { id: 'seo',        label: 'SEO Global', icon: SearchIcon },
]

export default function CmsTab() {
  const [activeTab, setActiveTab] = useState<CmsMainTab>('pages')
  const [editingPage, setEditingPage] = useState<CmsPage | null>(null)

  if (editingPage) {
    return (
      <PageEditor
        page={editingPage}
        onBack={() => setEditingPage(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">CMS Site</h1>

      <div className="flex items-center gap-0 border-b border-slate-700">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'border-brand-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'pages'      && <PagesTab onEditPage={setEditingPage} />}
      {activeTab === 'navigation' && <NavigationEditor />}
      {activeTab === 'seo'        && <SeoGlobalEditor />}
    </div>
  )
}
