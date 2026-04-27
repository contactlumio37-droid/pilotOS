import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, X, Trash2, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { BlogPost } from '@/types/database'

interface DraftPost {
  title: string
  slug: string
  excerpt: string
  content: string
  published: boolean
}

const EMPTY_DRAFT: DraftPost = {
  title: '', slug: '', excerpt: '', content: '', published: false,
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function BlogTab() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<BlogPost | null>(null)
  const [draft, setDraft] = useState<DraftPost>(EMPTY_DRAFT)

  const { data: posts = [], isLoading } = useQuery({
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

  const savePost = useMutation({
    mutationFn: async (d: DraftPost) => {
      if (editing) {
        const { error } = await supabase
          .from('blog_posts')
          .update({
            title: d.title, slug: d.slug, excerpt: d.excerpt || null,
            content: d.content || null, published: d.published,
            published_at: d.published ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('blog_posts')
          .insert({
            title: d.title, slug: d.slug, excerpt: d.excerpt || null,
            content: d.content || null, published: d.published,
            published_at: d.published ? new Date().toISOString() : null,
          })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['superadmin_blog'] })
      setShowForm(false)
      setEditing(null)
      setDraft(EMPTY_DRAFT)
    },
  })

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin_blog'] }),
  })

  const togglePublished = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase
        .from('blog_posts')
        .update({
          published,
          published_at: published ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin_blog'] }),
  })

  function openNew() {
    setEditing(null)
    setDraft(EMPTY_DRAFT)
    setShowForm(true)
  }

  function openEdit(post: BlogPost) {
    setEditing(post)
    setDraft({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? '',
      content: post.content ?? '',
      published: post.published,
    })
    setShowForm(true)
  }

  if (isLoading) {
    return <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-800 rounded-xl animate-pulse" />)}</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Blog</h2>
          <p className="text-slate-400 text-sm">{posts.length} articles · {posts.filter(p => p.published).length} publiés</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 text-sm px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvel article
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              {editing ? 'Modifier l\'article' : 'Nouvel article'}
            </h3>
            <button onClick={() => { setShowForm(false); setEditing(null) }}>
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Titre *</label>
              <input
                value={draft.title}
                onChange={e => setDraft(d => ({
                  ...d, title: e.target.value,
                  slug: d.slug || toSlug(e.target.value),
                }))}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Slug *</label>
              <input
                value={draft.slug}
                onChange={e => setDraft(d => ({ ...d, slug: e.target.value }))}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Extrait</label>
            <input
              value={draft.excerpt}
              onChange={e => setDraft(d => ({ ...d, excerpt: e.target.value }))}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Résumé court (affiché dans les listes)"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Contenu Markdown</label>
            <textarea
              value={draft.content}
              onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
              rows={8}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
              placeholder="# Titre&#10;&#10;Contenu en markdown..."
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={e => setDraft(d => ({ ...d, published: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-slate-300">Publier immédiatement</span>
            </label>
            <button
              onClick={() => draft.title && draft.slug && savePost.mutate(draft)}
              disabled={!draft.title || !draft.slug || savePost.isPending}
              className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {savePost.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {posts.map(post => (
          <div
            key={post.id}
            className="flex items-center gap-4 bg-slate-800 rounded-xl px-5 py-3 border border-slate-700 hover:border-slate-600 group"
          >
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(post)}>
              <p className="text-sm font-medium text-white truncate">{post.title}</p>
              <p className="text-xs text-slate-500 font-mono truncate">{post.slug}</p>
            </div>
            {post.excerpt && (
              <p className="text-xs text-slate-500 hidden lg:block truncate max-w-xs">{post.excerpt}</p>
            )}
            <span className="text-xs text-slate-500 shrink-0">
              {new Date(post.created_at).toLocaleDateString('fr-FR')}
            </span>
            <button
              onClick={() => togglePublished.mutate({ id: post.id, published: !post.published })}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors shrink-0 ${
                post.published
                  ? 'border-green-700 text-green-400'
                  : 'border-slate-600 text-slate-500 hover:border-slate-500'
              }`}
            >
              {post.published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {post.published ? 'Publié' : 'Brouillon'}
            </button>
            <button
              onClick={() => deletePost.mutate(post.id)}
              className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {posts.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            Aucun article — créez le premier pour animer votre blog.
          </div>
        )}
      </div>
    </div>
  )
}
