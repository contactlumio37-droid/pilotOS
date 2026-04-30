import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, Trash2, Eye, EyeOff, ChevronLeft, Search,
  Settings, X, Star, Clock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/useToast'
import BlockEditor, { type Block } from '@/components/editor/BlockEditor'
import type { BlogPost, BlogCategory } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────

type EditorPost = {
  id: string | null
  title: string
  slug: string
  excerpt: string
  content_blocks: Block[]
  cover_image: string
  categories: string[]
  keywords: string
  seo_title: string
  seo_description: string
  featured: boolean
  published: boolean
}

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type ListFilter = 'all' | 'published' | 'draft'

// ── Helpers ───────────────────────────────────────────────────

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function readTime(blocks: Block[]): number {
  const text = blocks
    .map(b => {
      if ('content' in b) return (b as { content: string }).content
      if ('items' in b) return (b as { items: string[] }).items.join(' ')
      return ''
    })
    .join(' ')
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

const EMPTY_POST: EditorPost = {
  id: null, title: '', slug: '', excerpt: '',
  content_blocks: [], cover_image: '', categories: [],
  keywords: '', seo_title: '', seo_description: '',
  featured: false, published: false,
}

// ── Hooks ─────────────────────────────────────────────────────

function usePosts() {
  return useQuery({
    queryKey: ['superadmin_blog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as BlogPost[]
    },
  })
}

function useCategories() {
  return useQuery({
    queryKey: ['blog_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .order('name')
      if (error) throw error
      return data as BlogCategory[]
    },
  })
}

function useSavePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ post, publish }: { post: EditorPost; publish?: boolean }) => {
      const payload = {
        title:           post.title,
        slug:            post.slug,
        excerpt:         post.excerpt || null,
        content_blocks:  post.content_blocks as unknown as Record<string, unknown>[],
        cover_image:     post.cover_image || null,
        categories:      post.categories,
        keywords:        post.keywords || null,
        seo_title:       post.seo_title || null,
        seo_description: post.seo_description || null,
        featured:        post.featured,
        published:       publish !== undefined ? publish : post.published,
        published_at:    (publish || post.published) ? new Date().toISOString() : null,
        read_time_minutes: readTime(post.content_blocks),
        updated_at:      new Date().toISOString(),
      }
      if (post.id) {
        const { error } = await supabase.from('blog_posts').update(payload).eq('id', post.id)
        if (error) throw error
        return post.id
      } else {
        const { data, error } = await supabase.from('blog_posts').insert(payload).select('id').single()
        if (error) throw error
        return data.id as string
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin_blog'] }),
  })
}

function useDeletePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin_blog'] }),
  })
}

function useTogglePublished() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase
        .from('blog_posts')
        .update({ published, published_at: published ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin_blog'] }),
  })
}

function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      const { error } = await supabase.from('blog_categories').insert({ name, slug })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blog_categories'] }),
  })
}

function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blog_categories'] }),
  })
}

// ── Categories dialog ─────────────────────────────────────────

function CategoriesDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const { data: categories = [] } = useCategories()
  const createCat = useCreateCategory()
  const deleteCat = useDeleteCategory()
  const [name, setName] = useState('')

  async function handleCreate() {
    if (!name.trim()) return
    try {
      await createCat.mutateAsync({ name: name.trim(), slug: toSlug(name.trim()) })
      setName('')
      toast.success('Catégorie créée')
    } catch {
      toast.error('Erreur lors de la création')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold">Catégories de blog</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Nom de la catégorie…"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={handleCreate}
            disabled={!name.trim() || createCat.isPending}
            className="px-3 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2">
              <div>
                <span className="text-sm text-white">{cat.name}</span>
                <span className="text-xs text-slate-500 ml-2 font-mono">{cat.slug}</span>
              </div>
              <button
                onClick={() => deleteCat.mutate(cat.id)}
                disabled={deleteCat.isPending}
                className="text-slate-600 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-4">Aucune catégorie — créez la première.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Editor mode ───────────────────────────────────────────────

interface EditorModeProps {
  post: EditorPost
  onBack: () => void
  onSaved: (id: string) => void
}

function EditorMode({ post: initialPost, onBack, onSaved }: EditorModeProps) {
  const toast = useToast()
  const savePost = useSavePost()
  const { data: categories = [] } = useCategories()

  const [post, setPost] = useState<EditorPost>(initialPost)
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle')
  const [showCategories, setShowCategories] = useState(false)

  // Auto-save refs (pattern Firegrade)
  const lastSavedRef = useRef(JSON.stringify(initialPost.content_blocks))
  const postRef = useRef(post)
  postRef.current = post

  // Sync content_blocks changes to ref
  const handleBlocksChange = useCallback((blocks: Block[]) => {
    setPost(p => ({ ...p, content_blocks: blocks }))
  }, [])

  // Auto-save every 30 seconds if title is set and content changed
  useEffect(() => {
    const interval = setInterval(async () => {
      const current = postRef.current
      if (!current.title.trim()) return
      const serialized = JSON.stringify(current.content_blocks)
      if (serialized === lastSavedRef.current) return

      setAutoSaveStatus('saving')
      try {
        const id = await savePost.mutateAsync({ post: current })
        if (!current.id) {
          setPost(p => ({ ...p, id }))
          onSaved(id)
        }
        lastSavedRef.current = serialized
        setAutoSaveStatus('saved')
        setTimeout(() => setAutoSaveStatus('idle'), 2000)
      } catch {
        setAutoSaveStatus('error')
      }
    }, 30_000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(publish?: boolean) {
    if (!post.title.trim() || !post.slug.trim()) {
      toast.error('Titre et slug requis')
      return
    }
    try {
      const id = await savePost.mutateAsync({ post, publish })
      if (!post.id) {
        setPost(p => ({ ...p, id, published: publish ?? p.published }))
        onSaved(id)
      } else {
        setPost(p => ({ ...p, published: publish ?? p.published }))
      }
      lastSavedRef.current = JSON.stringify(post.content_blocks)
      toast.success(publish ? 'Article publié ✓' : 'Brouillon sauvegardé ✓')
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const AUTOSAVE_TEXT: Record<AutoSaveStatus, string> = {
    idle:   '',
    saving: 'Sauvegarde…',
    saved:  'Sauvegardé ✓',
    error:  'Erreur autosave',
  }

  return (
    <div className="flex flex-col h-full">
      {/* Editor header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Retour
        </button>
        {autoSaveStatus !== 'idle' && (
          <span className={`text-xs ${autoSaveStatus === 'error' ? 'text-red-400' : autoSaveStatus === 'saving' ? 'text-slate-400' : 'text-green-400'}`}>
            {AUTOSAVE_TEXT[autoSaveStatus as AutoSaveStatus]}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => handleSave(false)}
            disabled={savePost.isPending}
            className="text-sm px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50"
          >
            Brouillon
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={savePost.isPending}
            className="text-sm px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {post.published ? 'Mettre à jour' : 'Publier'}
          </button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0 overflow-auto">
        {/* Left column — title + editor (70%) */}
        <div className="flex-1 min-w-0 space-y-4">
          <input
            value={post.title}
            onChange={e => setPost(p => ({
              ...p,
              title: e.target.value,
              slug: p.slug || toSlug(e.target.value),
            }))}
            placeholder="Titre de l'article…"
            className="w-full bg-transparent text-2xl font-bold text-white placeholder:text-slate-600 border-none outline-none focus:outline-none"
          />
          <input
            value={post.slug}
            onChange={e => setPost(p => ({ ...p, slug: e.target.value }))}
            placeholder="slug-de-l-article"
            className="w-full bg-transparent text-xs font-mono text-slate-500 border-none outline-none focus:outline-none"
          />
          <BlockEditor
            key={post.id ?? 'new'}
            initialBlocks={post.content_blocks}
            onChange={handleBlocksChange}
          />
        </div>

        {/* Right column — metadata (30%) */}
        <div className="w-72 shrink-0 space-y-5">
          {/* Excerpt */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Extrait</label>
            <textarea
              value={post.excerpt}
              onChange={e => setPost(p => ({ ...p, excerpt: e.target.value }))}
              rows={3}
              placeholder="Résumé court affiché dans les listes…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {/* Cover image */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Image de couverture</label>
            <input
              value={post.cover_image}
              onChange={e => setPost(p => ({ ...p, cover_image: e.target.value }))}
              placeholder="https://…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {post.cover_image && (
              <img src={post.cover_image} alt="" className="mt-2 w-full h-24 object-cover rounded-lg" />
            )}
          </div>

          {/* Categories */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-400">Catégories</label>
              <button onClick={() => setShowCategories(true)} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                <Settings className="w-3 h-3" /> Gérer
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => {
                const active = post.categories.includes(cat.name)
                return (
                  <button
                    key={cat.id}
                    onClick={() => setPost(p => ({
                      ...p,
                      categories: active
                        ? p.categories.filter(c => c !== cat.name)
                        : [...p.categories, cat.name],
                    }))}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      active
                        ? 'border-brand-500 text-brand-300 bg-brand-900/30'
                        : 'border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {cat.name}
                  </button>
                )
              })}
              {categories.length === 0 && (
                <span className="text-xs text-slate-600">Aucune catégorie — cliquez sur Gérer</span>
              )}
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Mots-clés</label>
            <input
              value={post.keywords}
              onChange={e => setPost(p => ({ ...p, keywords: e.target.value }))}
              placeholder="qualité, management, lean…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* SEO */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 block">SEO</label>
            <input
              value={post.seo_title}
              onChange={e => setPost(p => ({ ...p, seo_title: e.target.value }))}
              placeholder="Titre SEO (60 car. max)"
              maxLength={60}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <textarea
              value={post.seo_description}
              onChange={e => setPost(p => ({ ...p, seo_description: e.target.value }))}
              placeholder="Description SEO (160 car. max)"
              maxLength={160}
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {/* Featured */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setPost(p => ({ ...p, featured: !p.featured }))}
              className={`w-8 h-4 rounded-full transition-colors ${post.featured ? 'bg-brand-600' : 'bg-slate-700'}`}
            >
              <div className={`w-3 h-3 bg-white rounded-full mt-0.5 transition-transform ${post.featured ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Star className="w-3 h-3" /> Mis en avant
            </span>
          </label>

          {/* Read time estimate */}
          {post.content_blocks.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              {readTime(post.content_blocks)} min de lecture estimé
            </div>
          )}
        </div>
      </div>

      {showCategories && <CategoriesDialog onClose={() => setShowCategories(false)} />}
    </div>
  )
}

// ── List mode ─────────────────────────────────────────────────

interface ListModeProps {
  onEdit: (post: EditorPost) => void
  onNew: () => void
}

function ListMode({ onEdit, onNew }: ListModeProps) {
  const toast = useToast()
  const { data: posts = [], isLoading } = usePosts()
  const deletePost = useDeletePost()
  const togglePublished = useTogglePublished()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ListFilter>('all')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const filtered = posts
    .filter(p => filter === 'all' || (filter === 'published' ? p.published : !p.published))
    .filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()))

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  function openEdit(post: BlogPost) {
    const contentBlocks = (post.content_blocks ?? []) as unknown as Block[]
    onEdit({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? '',
      content_blocks: contentBlocks,
      cover_image: post.cover_image ?? post.cover_image_url ?? '',
      categories: post.categories ?? [],
      keywords: post.keywords ?? '',
      seo_title: post.seo_title ?? '',
      seo_description: post.seo_description ?? '',
      featured: post.featured ?? false,
      published: post.published,
    })
  }

  async function handleDelete(id: string) {
    try {
      await deletePost.mutateAsync(id)
      toast.success('Article supprimé')
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  async function handleToggle(id: string, published: boolean) {
    try {
      await togglePublished.mutateAsync({ id, published })
      toast.success(published ? 'Article publié' : 'Passé en brouillon')
    } catch {
      toast.error('Erreur')
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Blog</h2>
          <p className="text-slate-400 text-sm">
            {posts.length} articles · {posts.filter(p => p.published).length} publiés
          </p>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-2 text-sm px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvel article
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Rechercher par titre…"
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
          {(['all', 'published', 'draft'] as ListFilter[]).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(0) }}
              className={`text-xs px-3 py-1 rounded-md transition-colors ${
                filter === f ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'Tous' : f === 'published' ? 'Publiés' : 'Brouillons'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-800 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {paginated.map(post => (
              <div
                key={post.id}
                className="flex items-center gap-4 bg-slate-800 rounded-xl px-4 py-3 border border-slate-700 hover:border-slate-600 group"
              >
                {/* Thumbnail */}
                {(post.cover_image || post.cover_image_url) ? (
                  <img
                    src={(post.cover_image || post.cover_image_url)!}
                    alt=""
                    className="w-12 h-10 object-cover rounded-lg shrink-0"
                  />
                ) : (
                  <div className="w-12 h-10 bg-slate-700 rounded-lg shrink-0" />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(post)}>
                  <p className="text-sm font-medium text-white truncate">{post.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {post.categories?.[0] && (
                      <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">{post.categories[0]}</span>
                    )}
                    <span className="text-xs text-slate-500 font-mono truncate">{post.slug}</span>
                  </div>
                </div>

                <span className="text-xs text-slate-500 shrink-0 hidden lg:block">
                  {new Date(post.created_at).toLocaleDateString('fr-FR')}
                </span>

                {/* Status toggle */}
                <button
                  onClick={() => handleToggle(post.id, !post.published)}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-colors shrink-0 ${
                    post.published
                      ? 'border-green-700 text-green-400 bg-green-900/20'
                      : 'border-slate-600 text-slate-500 hover:border-slate-500'
                  }`}
                >
                  {post.published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {post.published ? 'Publié' : 'Brouillon'}
                </button>

                {/* Featured badge */}
                {post.featured && (
                  <Star className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                )}

                {/* Delete */}
                <button
                  onClick={() => handleDelete(post.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {paginated.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                {search
                  ? `Aucun résultat pour "${search}"`
                  : filter === 'published'
                    ? 'Aucun article publié.'
                    : filter === 'draft'
                      ? 'Aucun brouillon.'
                      : 'Créez votre premier article pour animer votre blog.'}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-slate-400">
              <span>{filtered.length} articles</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 rounded border border-slate-700 hover:border-slate-600 disabled:opacity-30 transition-colors"
                >
                  Précédent
                </button>
                <span>{page + 1} / {totalPages}</span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 rounded border border-slate-700 hover:border-slate-600 disabled:opacity-30 transition-colors"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────

export default function BlogTab() {
  const [editingPost, setEditingPost] = useState<EditorPost | null>(null)

  function openNew() {
    setEditingPost({ ...EMPTY_POST })
  }

  function openEdit(post: EditorPost) {
    setEditingPost(post)
  }

  function handleBack() {
    setEditingPost(null)
  }

  function handleSaved(id: string) {
    setEditingPost(p => p ? { ...p, id } : p)
  }

  if (editingPost) {
    return (
      <EditorMode
        post={editingPost}
        onBack={handleBack}
        onSaved={handleSaved}
      />
    )
  }

  return <ListMode onEdit={openEdit} onNew={openNew} />
}
