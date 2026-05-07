import { useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, Plus, Trash2, ArrowUp, ArrowDown,
  Eye, Save, Globe,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/useToast'
import type { CmsPage } from '@/types/database'

// ── Block types ───────────────────────────────────────────────

export type CmsBlockType =
  | 'hero' | 'features' | 'testimonials' | 'cta'
  | 'faq' | 'stats' | 'text' | 'image' | 'divider'
  | 'columns' | 'video' | 'carousel' | 'pricing'
  | 'newsletter_signup' | 'html' | 'image_text'
  | 'spacer' | 'button' | 'file_download' | 'blog_listing'

export interface CmsBlock {
  id: string
  type: CmsBlockType
  config: Record<string, unknown>
}

function makeBlock(type: CmsBlockType): CmsBlock {
  return { id: crypto.randomUUID(), type, config: {} }
}

const BLOCK_CATALOG: { type: CmsBlockType; label: string; emoji: string; description: string }[] = [
  { type: 'hero',             label: 'Hero',             emoji: '🎯', description: 'Titre principal + CTA' },
  { type: 'features',         label: 'Features',         emoji: '✨', description: 'Grille de fonctionnalités' },
  { type: 'testimonials',     label: 'Témoignages',      emoji: '💬', description: 'Citations clients' },
  { type: 'cta',              label: 'CTA',              emoji: '🚀', description: 'Appel à l\'action' },
  { type: 'faq',              label: 'FAQ',              emoji: '❓', description: 'Questions fréquentes' },
  { type: 'stats',            label: 'Stats',            emoji: '📊', description: 'Chiffres clés' },
  { type: 'pricing',          label: 'Tarifs',           emoji: '💰', description: 'Tableau des offres' },
  { type: 'columns',          label: 'Colonnes',         emoji: '▦',  description: 'Mise en page multi-col' },
  { type: 'image_text',       label: 'Image + Texte',    emoji: '🖼',  description: 'Bloc image + contenu' },
  { type: 'carousel',         label: 'Carousel',         emoji: '🎠', description: 'Défilement d\'images' },
  { type: 'video',            label: 'Vidéo',            emoji: '▶',  description: 'Embed YouTube/Vimeo' },
  { type: 'newsletter_signup',label: 'Newsletter',       emoji: '📧', description: 'Formulaire d\'inscription' },
  { type: 'blog_listing',     label: 'Blog',             emoji: '📰', description: 'Liste d\'articles' },
  { type: 'text',             label: 'Texte libre',      emoji: '📝', description: 'Contenu libre' },
  { type: 'image',            label: 'Image',            emoji: '🖼', description: 'Image + légende' },
  { type: 'button',           label: 'Bouton',           emoji: '🔘', description: 'Bouton d\'action' },
  { type: 'file_download',    label: 'Téléchargement',   emoji: '📥', description: 'Lien de fichier' },
  { type: 'html',             label: 'HTML libre',       emoji: '</>', description: 'Code HTML arbitraire' },
  { type: 'spacer',           label: 'Espacement',       emoji: '↕',  description: 'Espace vertical' },
  { type: 'divider',          label: 'Séparateur',       emoji: '─',  description: 'Ligne de séparation' },
]

// ── Block Preview ─────────────────────────────────────────────

function BlockPreview({ block, selected, onClick }: { block: CmsBlock; selected: boolean; onClick: () => void }) {
  const c = block.config

  const renderInner = () => {
    switch (block.type) {
      case 'hero':
        return (
          <div className="bg-brand-600/10 border border-brand-600/20 rounded-xl p-6 text-center">
            <p className="text-lg font-bold text-white mb-1">{(c.title as string) || 'Titre Hero'}</p>
            <p className="text-sm text-slate-400 mb-3">{(c.subtitle as string) || 'Sous-titre hero'}</p>
            <span className="inline-block bg-brand-600 text-white text-xs px-4 py-1.5 rounded-lg">{(c.cta_label as string) || 'Commencer'}</span>
          </div>
        )
      case 'features':
        return (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-sm font-semibold text-white mb-2">{(c.title as string) || 'Fonctionnalités'}</p>
            <div className="grid grid-cols-3 gap-2">
              {((c.items as { title: string }[] | undefined) ?? [{ title: 'Feature 1' }, { title: 'Feature 2' }, { title: 'Feature 3' }]).slice(0, 3).map((item, i) => (
                <div key={i} className="bg-slate-700 rounded-lg p-2 text-center">
                  <p className="text-xs text-slate-300">{item.title}</p>
                </div>
              ))}
            </div>
          </div>
        )
      case 'cta':
        return (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 text-center">
            <p className="text-base font-bold text-white mb-1">{(c.title as string) || 'Appel à l\'action'}</p>
            <p className="text-xs text-slate-400 mb-3">{(c.subtitle as string) || ''}</p>
            <span className="inline-block bg-brand-600 text-white text-xs px-4 py-1.5 rounded-lg">{(c.button_label as string) || 'Démarrer'}</span>
          </div>
        )
      case 'stats':
        return (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="grid grid-cols-3 gap-3">
              {((c.items as { value: string; label: string }[] | undefined) ?? [{ value: '100+', label: 'Clients' }, { value: '99%', label: 'Satisfaction' }, { value: '24/7', label: 'Support' }]).slice(0, 3).map((item, i) => (
                <div key={i} className="text-center">
                  <p className="text-lg font-bold text-brand-400">{item.value}</p>
                  <p className="text-[10px] text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        )
      case 'testimonials':
        return (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-2">💬 Témoignages</p>
            <p className="text-sm text-slate-300 italic">"Exemple de témoignage client…"</p>
          </div>
        )
      case 'text':
        return (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-sm text-slate-300 leading-relaxed line-clamp-3">{(c.content as string) || 'Contenu texte libre…'}</p>
          </div>
        )
      case 'image':
        return (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            {c.url ? (
              <img src={c.url as string} alt={(c.alt as string) || ''} className="max-h-32 mx-auto rounded-lg object-cover" />
            ) : (
              <div className="h-20 bg-slate-700 rounded-lg flex items-center justify-center">
                <span className="text-slate-500 text-sm">🖼 Image</span>
              </div>
            )}
            {!!c.caption && <p className="text-xs text-slate-500 mt-1">{String(c.caption)}</p>}
          </div>
        )
      case 'divider':
        return (
          <div className="py-3">
            <div className={`w-full ${(c.style as string) === 'dashed' ? 'border-dashed' : (c.style as string) === 'none' ? 'opacity-0' : ''} border-t border-slate-700`} />
          </div>
        )
      case 'columns': {
        const cols = (c.columns as { content: string }[] | undefined) ?? [{ content: 'Colonne 1' }, { content: 'Colonne 2' }]
        return (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-[10px] text-slate-500 mb-2">▦ {cols.length} colonnes</p>
            <div className={`grid gap-2 grid-cols-${Math.min(cols.length, 4)}`}>
              {cols.map((col, i) => (
                <div key={i} className="bg-slate-700 rounded p-2 text-xs text-slate-300 truncate">{col.content || `Col ${i+1}`}</div>
              ))}
            </div>
          </div>
        )
      }
      case 'video':
        return (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <div className="h-20 bg-slate-700 rounded-lg flex items-center justify-center">
              <span className="text-slate-400 text-sm">▶ {(c.url as string) ? 'Vidéo configurée' : 'URL vidéo non définie'}</span>
            </div>
            {!!c.caption && <p className="text-xs text-slate-500 mt-1">{String(c.caption)}</p>}
          </div>
        )
      case 'carousel': {
        const slides = (c.slides as { url: string; caption?: string }[] | undefined) ?? []
        return (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-[10px] text-slate-500 mb-2">🎠 {slides.length} slide{slides.length !== 1 ? 's' : ''}</p>
            <div className="flex gap-2 overflow-hidden">
              {slides.slice(0, 3).map((s, i) => (
                <div key={i} className="w-16 h-10 bg-slate-700 rounded shrink-0 overflow-hidden">
                  {s.url && <img src={s.url} alt="" className="w-full h-full object-cover" />}
                </div>
              ))}
              {slides.length === 0 && <div className="text-xs text-slate-500">Aucune image</div>}
            </div>
          </div>
        )
      }
      case 'pricing': {
        const plans = (c.plans as { name: string; price: string }[] | undefined) ?? [{ name: 'Free', price: '0€' }, { name: 'Pro', price: '29€' }]
        return (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-[10px] text-slate-500 mb-2">💰 Tarifs</p>
            <div className="flex gap-2">
              {plans.slice(0, 3).map((p, i) => (
                <div key={i} className="flex-1 bg-slate-700 rounded p-2 text-center">
                  <p className="text-xs font-medium text-white">{p.name}</p>
                  <p className="text-xs text-brand-400">{p.price}</p>
                </div>
              ))}
            </div>
          </div>
        )
      }
      case 'newsletter_signup':
        return (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-sm font-medium text-white mb-1">{(c.title as string) || 'Restez informé'}</p>
            <div className="flex gap-2 max-w-xs mx-auto">
              <div className="flex-1 h-8 bg-slate-700 rounded text-xs text-slate-500 flex items-center px-2">Email…</div>
              <div className="h-8 px-3 bg-brand-600 rounded text-xs text-white flex items-center">{(c.button_label as string) || 'S\'inscrire'}</div>
            </div>
          </div>
        )
      case 'html':
        return (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-[10px] text-slate-500 mb-1">&lt;/&gt; HTML libre</p>
            <pre className="text-xs text-slate-400 line-clamp-3 font-mono">{(c.code as string) || '<!-- HTML ici -->'}</pre>
          </div>
        )
      case 'image_text':
        return (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className={`flex gap-3 ${(c.image_position as string) === 'right' ? 'flex-row-reverse' : ''}`}>
              <div className="w-16 h-12 bg-slate-700 rounded shrink-0 overflow-hidden">
                {!!c.image_url && <img src={c.image_url as string} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-white mb-1">{(c.title as string) || 'Titre'}</p>
                <p className="text-[10px] text-slate-400 line-clamp-2">{(c.content as string) || 'Contenu…'}</p>
              </div>
            </div>
          </div>
        )
      case 'spacer':
        return (
          <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-xl flex items-center justify-center text-slate-600 text-xs" style={{ height: `${Math.max(20, Math.min(Number(c.height) || 40, 80))}px` }}>
            ↕ Espacement {c.height ? `${c.height}px` : ''}
          </div>
        )
      case 'button':
        return (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex justify-center">
            <span className={`inline-block text-xs px-4 py-1.5 rounded-lg ${(c.variant as string) === 'secondary' ? 'border border-brand-500 text-brand-400' : 'bg-brand-600 text-white'}`}>
              {(c.label as string) || 'Bouton'}
            </span>
          </div>
        )
      case 'file_download':
        return (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">📥</span>
            <div>
              <p className="text-sm font-medium text-white">{(c.label as string) || 'Télécharger le fichier'}</p>
              <p className="text-xs text-slate-500">{(c.url as string) || 'URL non configurée'}</p>
            </div>
          </div>
        )
      case 'blog_listing':
        return (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-[10px] text-slate-500 mb-2">📰 Articles ({(c.limit as number) || 3} max)</p>
            <div className="space-y-1.5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-6 bg-slate-700 rounded animate-pulse" />
              ))}
            </div>
          </div>
        )
      default:
        return (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-sm text-slate-400 capitalize">{block.type}</p>
          </div>
        )
    }
  }

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl transition-all ${selected ? 'ring-2 ring-brand-500' : 'hover:ring-1 hover:ring-slate-600'}`}
    >
      {renderInner()}
    </div>
  )
}

// ── Block Config Panel ────────────────────────────────────────

function BlockConfigPanel({
  block,
  onChange,
}: {
  block: CmsBlock
  onChange: (config: Record<string, unknown>) => void
}) {
  const c = block.config

  function set(key: string, value: unknown) {
    onChange({ ...c, [key]: value })
  }

  function setListItem(listKey: string, index: number, field: string, value: unknown) {
    const list = (c[listKey] as Record<string, unknown>[] | undefined) ?? []
    const updated = list.map((item, i) => i === index ? { ...item, [field]: value } : item)
    onChange({ ...c, [listKey]: updated })
  }

  function addListItem(listKey: string, template: Record<string, unknown>) {
    const list = (c[listKey] as Record<string, unknown>[] | undefined) ?? []
    onChange({ ...c, [listKey]: [...list, template] })
  }

  function removeListItem(listKey: string, index: number) {
    const list = (c[listKey] as Record<string, unknown>[] | undefined) ?? []
    onChange({ ...c, [listKey]: list.filter((_, i) => i !== index) })
  }

  const inputClass = "w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-500"

  switch (block.type) {
    case 'hero':
      return (
        <div className="space-y-3">
          <Field label="Titre">
            <input value={(c.title as string) ?? ''} onChange={e => set('title', e.target.value)} placeholder="Titre principal…" className={inputClass} />
          </Field>
          <Field label="Sous-titre">
            <textarea value={(c.subtitle as string) ?? ''} onChange={e => set('subtitle', e.target.value)} rows={2} placeholder="Sous-titre…" className={`${inputClass} resize-none`} />
          </Field>
          <Field label="Label CTA">
            <input value={(c.cta_label as string) ?? ''} onChange={e => set('cta_label', e.target.value)} placeholder="Essayer gratuitement" className={inputClass} />
          </Field>
          <Field label="URL CTA">
            <input value={(c.cta_url as string) ?? ''} onChange={e => set('cta_url', e.target.value)} placeholder="/register" className={inputClass} />
          </Field>
          <Field label="Image de fond (URL)">
            <input value={(c.bg_image as string) ?? ''} onChange={e => set('bg_image', e.target.value)} placeholder="https://…" className={inputClass} />
          </Field>
        </div>
      )

    case 'features':
      return (
        <div className="space-y-3">
          <Field label="Titre section">
            <input value={(c.title as string) ?? ''} onChange={e => set('title', e.target.value)} placeholder="Nos fonctionnalités" className={inputClass} />
          </Field>
          <div>
            <p className="text-xs text-slate-400 mb-2">Items</p>
            {((c.items as { icon: string; title: string; description: string }[] | undefined) ?? []).map((item, i) => (
              <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-3 mb-2 space-y-2">
                <div className="flex gap-2">
                  <input value={item.icon ?? ''} onChange={e => setListItem('items', i, 'icon', e.target.value)} placeholder="Icône (emoji)" className="w-16 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:outline-none" />
                  <input value={item.title ?? ''} onChange={e => setListItem('items', i, 'title', e.target.value)} placeholder="Titre" className={`${inputClass} flex-1`} />
                  <button onClick={() => removeListItem('items', i)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <input value={item.description ?? ''} onChange={e => setListItem('items', i, 'description', e.target.value)} placeholder="Description" className={inputClass} />
              </div>
            ))}
            <button onClick={() => addListItem('items', { icon: '⭐', title: '', description: '' })} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Ajouter un item
            </button>
          </div>
        </div>
      )

    case 'testimonials':
      return (
        <div className="space-y-3">
          <Field label="Titre section">
            <input value={(c.title as string) ?? ''} onChange={e => set('title', e.target.value)} placeholder="Ce que disent nos clients" className={inputClass} />
          </Field>
          <div>
            <p className="text-xs text-slate-400 mb-2">Témoignages</p>
            {((c.items as { author: string; role: string; quote: string; avatar?: string }[] | undefined) ?? []).map((item, i) => (
              <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-3 mb-2 space-y-2">
                <div className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <input value={item.author ?? ''} onChange={e => setListItem('items', i, 'author', e.target.value)} placeholder="Auteur" className={inputClass} />
                    <input value={item.role ?? ''} onChange={e => setListItem('items', i, 'role', e.target.value)} placeholder="Rôle / Entreprise" className={inputClass} />
                  </div>
                  <button onClick={() => removeListItem('items', i)} className="text-slate-500 hover:text-red-400 mt-2"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <textarea value={item.quote ?? ''} onChange={e => setListItem('items', i, 'quote', e.target.value)} rows={2} placeholder="Citation…" className={`${inputClass} resize-none`} />
              </div>
            ))}
            <button onClick={() => addListItem('items', { author: '', role: '', quote: '' })} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Ajouter un témoignage
            </button>
          </div>
        </div>
      )

    case 'cta':
      return (
        <div className="space-y-3">
          <Field label="Titre"><input value={(c.title as string) ?? ''} onChange={e => set('title', e.target.value)} placeholder="Prêt à démarrer ?" className={inputClass} /></Field>
          <Field label="Sous-titre"><input value={(c.subtitle as string) ?? ''} onChange={e => set('subtitle', e.target.value)} placeholder="Rejoignez les équipes qui pilotent mieux" className={inputClass} /></Field>
          <Field label="Label bouton"><input value={(c.button_label as string) ?? ''} onChange={e => set('button_label', e.target.value)} placeholder="Commencer gratuitement" className={inputClass} /></Field>
          <Field label="URL bouton"><input value={(c.button_url as string) ?? ''} onChange={e => set('button_url', e.target.value)} placeholder="/register" className={inputClass} /></Field>
          <Field label="Variante">
            <select value={(c.variant as string) ?? 'primary'} onChange={e => set('variant', e.target.value)} className={inputClass}>
              <option value="primary">Primary (brand)</option>
              <option value="dark">Dark (slate-900)</option>
            </select>
          </Field>
        </div>
      )

    case 'faq':
      return (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">Questions/Réponses</p>
          {((c.items as { question: string; answer: string }[] | undefined) ?? []).map((item, i) => (
            <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-3 mb-2 space-y-2">
              <div className="flex gap-2">
                <input value={item.question ?? ''} onChange={e => setListItem('items', i, 'question', e.target.value)} placeholder="Question…" className={`${inputClass} flex-1`} />
                <button onClick={() => removeListItem('items', i)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <textarea value={item.answer ?? ''} onChange={e => setListItem('items', i, 'answer', e.target.value)} rows={2} placeholder="Réponse…" className={`${inputClass} resize-none`} />
            </div>
          ))}
          <button onClick={() => addListItem('items', { question: '', answer: '' })} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Ajouter une Q&A
          </button>
        </div>
      )

    case 'stats':
      return (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">Chiffres clés</p>
          {((c.items as { value: string; label: string }[] | undefined) ?? []).map((item, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input value={item.value ?? ''} onChange={e => setListItem('items', i, 'value', e.target.value)} placeholder="100+" className="w-20 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none" />
              <input value={item.label ?? ''} onChange={e => setListItem('items', i, 'label', e.target.value)} placeholder="Clients" className={`${inputClass} flex-1`} />
              <button onClick={() => removeListItem('items', i)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          <button onClick={() => addListItem('items', { value: '', label: '' })} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Ajouter un chiffre
          </button>
        </div>
      )

    case 'text':
      return (
        <div className="space-y-3">
          <Field label="Contenu">
            <textarea value={(c.content as string) ?? ''} onChange={e => set('content', e.target.value)} rows={5} placeholder="Contenu texte libre…" className={`${inputClass} resize-y`} />
          </Field>
          <Field label="Alignement">
            <select value={(c.align as string) ?? 'left'} onChange={e => set('align', e.target.value)} className={inputClass}>
              <option value="left">Gauche</option>
              <option value="center">Centré</option>
              <option value="right">Droite</option>
            </select>
          </Field>
        </div>
      )

    case 'image':
      return (
        <div className="space-y-3">
          <Field label="URL de l'image"><input value={(c.url as string) ?? ''} onChange={e => set('url', e.target.value)} placeholder="https://…" className={inputClass} /></Field>
          <Field label="Alt"><input value={(c.alt as string) ?? ''} onChange={e => set('alt', e.target.value)} placeholder="Description de l'image" className={inputClass} /></Field>
          <Field label="Légende"><input value={(c.caption as string) ?? ''} onChange={e => set('caption', e.target.value)} placeholder="Légende optionnelle" className={inputClass} /></Field>
          <Field label="Largeur">
            <select value={(c.width as string) ?? 'contained'} onChange={e => set('width', e.target.value)} className={inputClass}>
              <option value="contained">Contenu</option>
              <option value="full">Pleine largeur</option>
            </select>
          </Field>
        </div>
      )

    case 'divider':
      return (
        <Field label="Style">
          <select value={(c.style as string) ?? 'solid'} onChange={e => set('style', e.target.value)} className={inputClass}>
            <option value="solid">Plein</option>
            <option value="dashed">Pointillés</option>
            <option value="none">Invisible</option>
          </select>
        </Field>
      )

    case 'columns': {
      const cols = (c.columns as { content: string }[] | undefined) ?? []
      return (
        <div className="space-y-3">
          <Field label="Nombre de colonnes">
            <select value={String(cols.length || 2)} onChange={e => {
              const n = parseInt(e.target.value)
              const newCols = Array.from({ length: n }, (_, i) => cols[i] ?? { content: '' })
              set('columns', newCols)
            }} className={inputClass}>
              <option value="2">2 colonnes</option>
              <option value="3">3 colonnes</option>
              <option value="4">4 colonnes</option>
            </select>
          </Field>
          {cols.map((col, i) => (
            <Field key={i} label={`Colonne ${i + 1}`}>
              <textarea value={col.content ?? ''} onChange={e => setListItem('columns', i, 'content', e.target.value)} rows={3} placeholder="Contenu…" className={`${inputClass} resize-none`} />
            </Field>
          ))}
        </div>
      )
    }

    case 'video':
      return (
        <div className="space-y-3">
          <Field label="URL YouTube / Vimeo">
            <input value={(c.url as string) ?? ''} onChange={e => set('url', e.target.value)} placeholder="https://youtube.com/watch?v=…" className={inputClass} />
          </Field>
          <Field label="Légende">
            <input value={(c.caption as string) ?? ''} onChange={e => set('caption', e.target.value)} placeholder="Légende optionnelle" className={inputClass} />
          </Field>
          <Field label="Rapport d'aspect">
            <select value={(c.aspect as string) ?? '16/9'} onChange={e => set('aspect', e.target.value)} className={inputClass}>
              <option value="16/9">16:9</option>
              <option value="4/3">4:3</option>
              <option value="1/1">1:1</option>
            </select>
          </Field>
        </div>
      )

    case 'carousel': {
      const slides = (c.slides as { url: string; caption?: string }[] | undefined) ?? []
      return (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">Slides</p>
          {slides.map((slide, i) => (
            <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <input value={slide.url ?? ''} onChange={e => setListItem('slides', i, 'url', e.target.value)} placeholder="URL image" className={`${inputClass} flex-1`} />
                <button onClick={() => removeListItem('slides', i)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <input value={slide.caption ?? ''} onChange={e => setListItem('slides', i, 'caption', e.target.value)} placeholder="Légende (optionnel)" className={inputClass} />
            </div>
          ))}
          <button onClick={() => addListItem('slides', { url: '', caption: '' })} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Ajouter une slide
          </button>
          <Field label="Autoplay">
            <select value={String(c.autoplay ?? 'false')} onChange={e => set('autoplay', e.target.value === 'true')} className={inputClass}>
              <option value="false">Non</option>
              <option value="true">Oui</option>
            </select>
          </Field>
        </div>
      )
    }

    case 'pricing': {
      const plans = (c.plans as { name: string; price: string; period?: string; description?: string; features?: string[]; highlighted?: boolean; cta_label?: string; cta_url?: string }[] | undefined) ?? []
      return (
        <div className="space-y-3">
          <Field label="Titre section">
            <input value={(c.title as string) ?? ''} onChange={e => set('title', e.target.value)} placeholder="Nos offres" className={inputClass} />
          </Field>
          <p className="text-xs text-slate-400">Plans</p>
          {plans.map((plan, i) => (
            <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <input value={plan.name ?? ''} onChange={e => setListItem('plans', i, 'name', e.target.value)} placeholder="Nom" className={`${inputClass} flex-1`} />
                <input value={plan.price ?? ''} onChange={e => setListItem('plans', i, 'price', e.target.value)} placeholder="Prix" className="w-20 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none" />
                <button onClick={() => removeListItem('plans', i)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <input value={plan.description ?? ''} onChange={e => setListItem('plans', i, 'description', e.target.value)} placeholder="Description courte" className={inputClass} />
              <input value={(plan.features ?? []).join('\n')} onChange={e => setListItem('plans', i, 'features', e.target.value.split('\n'))} placeholder="Features (une par ligne)" className={`${inputClass} font-mono text-xs`} />
              <div className="flex gap-2">
                <input value={plan.cta_label ?? ''} onChange={e => setListItem('plans', i, 'cta_label', e.target.value)} placeholder="Label CTA" className={`${inputClass} flex-1`} />
                <input value={plan.cta_url ?? ''} onChange={e => setListItem('plans', i, 'cta_url', e.target.value)} placeholder="URL CTA" className={`${inputClass} flex-1`} />
              </div>
            </div>
          ))}
          <button onClick={() => addListItem('plans', { name: '', price: '', features: [] })} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Ajouter un plan
          </button>
        </div>
      )
    }

    case 'newsletter_signup':
      return (
        <div className="space-y-3">
          <Field label="Titre"><input value={(c.title as string) ?? ''} onChange={e => set('title', e.target.value)} placeholder="Restez informé" className={inputClass} /></Field>
          <Field label="Sous-titre"><input value={(c.subtitle as string) ?? ''} onChange={e => set('subtitle', e.target.value)} placeholder="Rejoignez notre newsletter" className={inputClass} /></Field>
          <Field label="Label bouton"><input value={(c.button_label as string) ?? ''} onChange={e => set('button_label', e.target.value)} placeholder="S'inscrire" className={inputClass} /></Field>
          <Field label="Placeholder email"><input value={(c.placeholder as string) ?? ''} onChange={e => set('placeholder', e.target.value)} placeholder="votre@email.fr" className={inputClass} /></Field>
        </div>
      )

    case 'html':
      return (
        <Field label="Code HTML">
          <textarea value={(c.code as string) ?? ''} onChange={e => set('code', e.target.value)} rows={8} placeholder="<div>…</div>" className={`${inputClass} resize-y font-mono text-xs`} />
        </Field>
      )

    case 'image_text':
      return (
        <div className="space-y-3">
          <Field label="Position de l'image">
            <select value={(c.image_position as string) ?? 'left'} onChange={e => set('image_position', e.target.value)} className={inputClass}>
              <option value="left">Gauche</option>
              <option value="right">Droite</option>
            </select>
          </Field>
          <Field label="URL image"><input value={(c.image_url as string) ?? ''} onChange={e => set('image_url', e.target.value)} placeholder="https://…" className={inputClass} /></Field>
          <Field label="Alt image"><input value={(c.image_alt as string) ?? ''} onChange={e => set('image_alt', e.target.value)} placeholder="Description" className={inputClass} /></Field>
          <Field label="Titre"><input value={(c.title as string) ?? ''} onChange={e => set('title', e.target.value)} placeholder="Titre" className={inputClass} /></Field>
          <Field label="Contenu">
            <textarea value={(c.content as string) ?? ''} onChange={e => set('content', e.target.value)} rows={4} placeholder="Texte descriptif…" className={`${inputClass} resize-none`} />
          </Field>
          <Field label="Label CTA">
            <input value={(c.cta_label as string) ?? ''} onChange={e => set('cta_label', e.target.value)} placeholder="En savoir plus" className={inputClass} />
          </Field>
          <Field label="URL CTA">
            <input value={(c.cta_url as string) ?? ''} onChange={e => set('cta_url', e.target.value)} placeholder="/features" className={inputClass} />
          </Field>
        </div>
      )

    case 'spacer':
      return (
        <Field label="Hauteur (px)">
          <input type="number" value={(c.height as number) ?? 40} onChange={e => set('height', parseInt(e.target.value))} min={8} max={200} className={inputClass} />
        </Field>
      )

    case 'button':
      return (
        <div className="space-y-3">
          <Field label="Label"><input value={(c.label as string) ?? ''} onChange={e => set('label', e.target.value)} placeholder="Bouton" className={inputClass} /></Field>
          <Field label="URL"><input value={(c.url as string) ?? ''} onChange={e => set('url', e.target.value)} placeholder="/register" className={inputClass} /></Field>
          <Field label="Variante">
            <select value={(c.variant as string) ?? 'primary'} onChange={e => set('variant', e.target.value)} className={inputClass}>
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="danger">Danger</option>
            </select>
          </Field>
          <Field label="Alignement">
            <select value={(c.align as string) ?? 'center'} onChange={e => set('align', e.target.value)} className={inputClass}>
              <option value="left">Gauche</option>
              <option value="center">Centré</option>
              <option value="right">Droite</option>
            </select>
          </Field>
          <Field label="Nouvel onglet">
            <select value={String(c.target_blank ?? 'false')} onChange={e => set('target_blank', e.target.value === 'true')} className={inputClass}>
              <option value="false">Non</option>
              <option value="true">Oui</option>
            </select>
          </Field>
        </div>
      )

    case 'file_download':
      return (
        <div className="space-y-3">
          <Field label="Label"><input value={(c.label as string) ?? ''} onChange={e => set('label', e.target.value)} placeholder="Télécharger le document" className={inputClass} /></Field>
          <Field label="URL du fichier"><input value={(c.url as string) ?? ''} onChange={e => set('url', e.target.value)} placeholder="https://…/fichier.pdf" className={inputClass} /></Field>
          <Field label="Description"><input value={(c.description as string) ?? ''} onChange={e => set('description', e.target.value)} placeholder="PDF · 2 Mo" className={inputClass} /></Field>
        </div>
      )

    case 'blog_listing':
      return (
        <div className="space-y-3">
          <Field label="Titre section">
            <input value={(c.title as string) ?? ''} onChange={e => set('title', e.target.value)} placeholder="Nos derniers articles" className={inputClass} />
          </Field>
          <Field label="Nombre d'articles">
            <input type="number" value={(c.limit as number) ?? 3} onChange={e => set('limit', parseInt(e.target.value))} min={1} max={12} className={inputClass} />
          </Field>
          <Field label="Catégorie (filtre)">
            <input value={(c.category as string) ?? ''} onChange={e => set('category', e.target.value)} placeholder="Laisser vide = toutes" className={inputClass} />
          </Field>
        </div>
      )

    default:
      return <p className="text-xs text-slate-500">Aucune configuration pour ce bloc.</p>
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs text-slate-400 block mb-1">{label}</label>
      {children}
    </div>
  )
}

// ── Page Editor ───────────────────────────────────────────────

interface PageEditorProps {
  page: CmsPage
  onBack: () => void
}

export default function PageEditor({ page, onBack }: PageEditorProps) {
  const qc = useQueryClient()
  const toast = useToast()
  const [blocks, setBlocks] = useState<CmsBlock[]>((page.sections ?? []) as unknown as CmsBlock[])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [published, setPublished] = useState(page.published)

  const selectedBlock = blocks.find(b => b.id === selectedId) ?? null

  function addBlock(type: CmsBlockType) {
    const block = makeBlock(type)
    setBlocks(prev => [...prev, block])
    setSelectedId(block.id)
  }

  function updateBlockConfig(id: string, config: Record<string, unknown>) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, config } : b))
  }

  function moveBlock(id: string, dir: -1 | 1) {
    setBlocks(prev => {
      const i = prev.findIndex(b => b.id === id)
      if (i + dir < 0 || i + dir >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[i + dir]] = [next[i + dir], next[i]]
      return next
    })
  }

  function removeBlock(id: string) {
    setBlocks(prev => prev.filter(b => b.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const saveMutation = useMutation({
    mutationFn: async ({ pub }: { pub?: boolean }) => {
      const { error } = await supabase
        .from('cms_pages')
        .update({
          sections: blocks as unknown as Record<string, unknown>[],
          published: pub ?? published,
          updated_at: new Date().toISOString(),
        })
        .eq('id', page.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms_pages'] })
    },
  })

  async function handleSave() {
    setSaving(true)
    try { await saveMutation.mutateAsync({}); toast.success('Page sauvegardée') }
    catch { toast.error('Erreur lors de la sauvegarde') } finally { setSaving(false) }
  }

  async function handleTogglePublish() {
    const next = !published
    setSaving(true)
    try {
      await saveMutation.mutateAsync({ pub: next })
      setPublished(next)
      toast.success(next ? 'Page publiée' : 'Page dépubliée')
    } catch { toast.error('Erreur') } finally { setSaving(false) }
  }

  const publicUrl = page.page_url ?? `/p/${page.slug}`

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Retour
        </button>
        <div className="flex items-center gap-2">
          {published && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              Voir la page
            </a>
          )}
          <button onClick={() => setShowPreview(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors">
            <Eye className="w-3.5 h-3.5" />
            Prévisualiser
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white disabled:opacity-50 transition-colors">
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Sauvegarde…' : 'Enregistrer'}
          </button>
          <button onClick={handleTogglePublish} disabled={saving} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg font-medium disabled:opacity-50 transition-colors ${published ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-brand-600 text-white hover:bg-brand-700'}`}>
            <Globe className="w-3.5 h-3.5" />
            {published ? 'Dépublier' : 'Publier'}
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: catalog */}
        <div className="w-[220px] shrink-0 space-y-1 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold px-2 mb-2">Blocs disponibles</p>
          {BLOCK_CATALOG.map(item => (
            <button
              key={item.type}
              onClick={() => addBlock(item.type)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-brand-500 hover:bg-slate-700 transition-colors text-left"
            >
              <span className="text-base shrink-0">{item.emoji}</span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-white">{item.label}</p>
                <p className="text-[10px] text-slate-500 truncate">{item.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Center: canvas */}
        <div className="flex-1 min-w-0 space-y-3 overflow-y-auto">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500">
              <p className="font-medium mb-1">Page vide</p>
              <p className="text-sm">Cliquez sur un bloc à gauche pour l'ajouter.</p>
            </div>
          ) : (
            blocks.map((block, i) => (
              <div key={block.id} className="group relative">
                <BlockPreview
                  block={block}
                  selected={selectedId === block.id}
                  onClick={() => setSelectedId(block.id)}
                />
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {i > 0 && (
                    <button onClick={() => moveBlock(block.id, -1)} className="p-1 bg-slate-900 border border-slate-700 rounded text-slate-400 hover:text-white">
                      <ArrowUp className="w-3 h-3" />
                    </button>
                  )}
                  {i < blocks.length - 1 && (
                    <button onClick={() => moveBlock(block.id, 1)} className="p-1 bg-slate-900 border border-slate-700 rounded text-slate-400 hover:text-white">
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  )}
                  <button onClick={() => removeBlock(block.id)} className="p-1 bg-slate-900 border border-slate-700 rounded text-slate-500 hover:text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right: config */}
        <div className="w-[280px] shrink-0 overflow-y-auto">
          {selectedBlock ? (
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-base">{BLOCK_CATALOG.find(b => b.type === selectedBlock.type)?.emoji}</span>
                <p className="text-sm font-semibold text-white capitalize">{BLOCK_CATALOG.find(b => b.type === selectedBlock.type)?.label ?? selectedBlock.type}</p>
              </div>
              <BlockConfigPanel
                block={selectedBlock}
                onChange={config => updateBlockConfig(selectedBlock.id, config)}
              />
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-dashed border-slate-700 rounded-2xl p-6 text-center text-slate-500 text-sm">
              Sélectionnez un bloc pour modifier ses propriétés
            </div>
          )}
        </div>
      </div>

      {/* Preview drawer */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setShowPreview(false)} />
          <div className="w-[700px] bg-white overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Prévisualisation — {page.title}</h3>
              <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 space-y-6">
              {blocks.map(block => (
                <div key={block.id}>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">{block.type}</p>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <pre className="text-xs text-slate-600 whitespace-pre-wrap">{JSON.stringify(block.config, null, 2)}</pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
