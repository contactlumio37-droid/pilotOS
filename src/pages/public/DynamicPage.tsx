import { useEffect } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CmsPage } from '@/types/database'
import type { CmsBlock } from '@/components/cms/PageEditor'

// ── Data fetching ─────────────────────────────────────────────

function useDynamicPage(slug: string) {
  return useQuery({
    queryKey: ['cms_page_public', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .single()
      if (error) return null
      return data as CmsPage
    },
    staleTime: 5 * 60 * 1000,
  })
}

// ── Block renderers ───────────────────────────────────────────

function RenderBlock({ block }: { block: CmsBlock }) {
  const c = block.config

  switch (block.type) {
    case 'hero': {
      const bgStyle = c.bg_image
        ? { backgroundImage: `url(${c.bg_image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : {}
      return (
        <section className="relative py-24 px-6 text-center bg-slate-900" style={bgStyle}>
          {c.bg_image && <div className="absolute inset-0 bg-slate-900/70" />}
          <div className="relative max-w-3xl mx-auto">
            {c.title && <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4">{String(c.title)}</h1>}
            {c.subtitle && <p className="text-xl text-slate-300 mb-8 leading-relaxed">{String(c.subtitle)}</p>}
            {c.cta_label && (
              <a href={(c.cta_url as string) || '#'} className="inline-block bg-brand-600 hover:bg-brand-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors">
                {String(c.cta_label)}
              </a>
            )}
          </div>
        </section>
      )
    }

    case 'features': {
      const items = (c.items as { icon?: string; title: string; description?: string }[] | undefined) ?? []
      return (
        <section className="py-16 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            {c.title && <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">{String(c.title)}</h2>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item, i) => (
                <div key={i} className="p-6 rounded-2xl border border-slate-200 bg-slate-50">
                  {item.icon && <div className="text-3xl mb-3">{item.icon}</div>}
                  <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                  {item.description && <p className="text-slate-600 text-sm">{item.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )
    }

    case 'testimonials': {
      const items = (c.items as { author: string; role?: string; quote: string; avatar?: string }[] | undefined) ?? []
      return (
        <section className="py-16 px-6 bg-slate-50">
          <div className="max-w-5xl mx-auto">
            {c.title && <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">{String(c.title)}</h2>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200">
                  <p className="text-slate-700 italic mb-4">"{item.quote}"</p>
                  <div className="flex items-center gap-3">
                    {item.avatar && <img src={item.avatar} alt={item.author} className="w-8 h-8 rounded-full object-cover" />}
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.author}</p>
                      {item.role && <p className="text-xs text-slate-500">{item.role}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )
    }

    case 'cta': {
      const dark = (c.variant as string) === 'dark'
      return (
        <section className={`py-16 px-6 text-center ${dark ? 'bg-slate-900' : 'bg-brand-600'}`}>
          <div className="max-w-2xl mx-auto">
            {c.title && <h2 className={`text-3xl font-bold mb-3 ${dark ? 'text-white' : 'text-white'}`}>{String(c.title)}</h2>}
            {c.subtitle && <p className={`mb-8 ${dark ? 'text-slate-300' : 'text-brand-100'}`}>{String(c.subtitle)}</p>}
            {c.button_label && (
              <a href={(c.button_url as string) || '#'} className={`inline-block font-semibold px-8 py-3 rounded-xl transition-colors ${dark ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-white text-brand-600 hover:bg-brand-50'}`}>
                {String(c.button_label)}
              </a>
            )}
          </div>
        </section>
      )
    }

    case 'faq': {
      const items = (c.items as { question: string; answer: string }[] | undefined) ?? []
      return (
        <section className="py-16 px-6 bg-white">
          <div className="max-w-3xl mx-auto">
            {c.title && <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">{String(c.title)}</h2>}
            <div className="space-y-4">
              {items.map((item, i) => (
                <details key={i} className="group border border-slate-200 rounded-xl">
                  <summary className="flex items-center justify-between p-5 cursor-pointer font-medium text-slate-900 list-none">
                    {item.question}
                    <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="px-5 pb-5 text-slate-600 text-sm leading-relaxed">{item.answer}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )
    }

    case 'stats': {
      const items = (c.items as { value: string; label: string }[] | undefined) ?? []
      return (
        <section className="py-16 px-6 bg-slate-900">
          <div className="max-w-4xl mx-auto">
            <div className={`grid gap-8 ${items.length <= 2 ? 'grid-cols-2' : items.length === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}>
              {items.map((item, i) => (
                <div key={i} className="text-center">
                  <p className="text-4xl font-black text-brand-400 mb-1">{item.value}</p>
                  <p className="text-slate-400 text-sm">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )
    }

    case 'pricing': {
      const plans = (c.plans as { name: string; price: string; period?: string; description?: string; features?: string[]; highlighted?: boolean; cta_label?: string; cta_url?: string }[] | undefined) ?? []
      return (
        <section className="py-16 px-6 bg-slate-50">
          <div className="max-w-5xl mx-auto">
            {c.title && <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">{String(c.title)}</h2>}
            <div className={`grid gap-6 ${plans.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
              {plans.map((plan, i) => (
                <div key={i} className={`rounded-2xl p-8 border ${plan.highlighted ? 'border-brand-500 bg-white shadow-lg shadow-brand-100' : 'border-slate-200 bg-white'}`}>
                  {plan.highlighted && <span className="inline-block text-xs bg-brand-600 text-white px-3 py-1 rounded-full mb-4 font-medium">Populaire</span>}
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{plan.name}</h3>
                  <div className="flex items-end gap-1 mb-4">
                    <span className="text-3xl font-black text-slate-900">{plan.price}</span>
                    {plan.period && <span className="text-slate-500 mb-1">/{plan.period}</span>}
                  </div>
                  {plan.description && <p className="text-slate-600 text-sm mb-6">{plan.description}</p>}
                  {plan.features && (
                    <ul className="space-y-2 mb-8">
                      {plan.features.filter(Boolean).map((f, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm text-slate-700">
                          <span className="text-green-500 shrink-0">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  {plan.cta_label && (
                    <a href={plan.cta_url || '#'} className={`block text-center font-semibold px-6 py-3 rounded-xl transition-colors ${plan.highlighted ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border border-slate-200 text-slate-700 hover:border-brand-500 hover:text-brand-600'}`}>
                      {plan.cta_label}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )
    }

    case 'columns': {
      const cols = (c.columns as { content: string }[] | undefined) ?? []
      const gridClass = cols.length === 2 ? 'grid-cols-1 md:grid-cols-2' : cols.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-4'
      return (
        <section className="py-12 px-6 bg-white">
          <div className={`max-w-5xl mx-auto grid gap-8 ${gridClass}`}>
            {cols.map((col, i) => (
              <div key={i} className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{col.content}</div>
            ))}
          </div>
        </section>
      )
    }

    case 'video': {
      const embedUrl = toEmbedUrl(c.url as string | undefined)
      const aspectMap: Record<string, string> = { '16/9': 'aspect-video', '4/3': 'aspect-[4/3]', '1/1': 'aspect-square' }
      const aspectClass = aspectMap[(c.aspect as string) ?? '16/9'] ?? 'aspect-video'
      return (
        <section className="py-12 px-6 bg-white">
          <div className="max-w-3xl mx-auto">
            {embedUrl ? (
              <div className={`${aspectClass} rounded-2xl overflow-hidden`}>
                <iframe src={embedUrl} title="video" className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
            ) : (
              <div className={`${aspectClass} bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400`}>Vidéo non configurée</div>
            )}
            {c.caption && <p className="text-center text-sm text-slate-500 mt-3">{String(c.caption)}</p>}
          </div>
        </section>
      )
    }

    case 'carousel': {
      const slides = (c.slides as { url: string; caption?: string }[] | undefined) ?? []
      if (slides.length === 0) return null
      return (
        <section className="py-12 px-6 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
              {slides.map((slide, i) => (
                <div key={i} className="shrink-0 snap-center w-80">
                  <img src={slide.url} alt={slide.caption ?? ''} className="w-full h-48 object-cover rounded-xl" />
                  {slide.caption && <p className="text-sm text-slate-500 text-center mt-2">{slide.caption}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )
    }

    case 'newsletter_signup':
      return (
        <section className="py-16 px-6 bg-slate-50">
          <div className="max-w-md mx-auto text-center">
            {c.title && <h2 className="text-2xl font-bold text-slate-900 mb-2">{String(c.title)}</h2>}
            {c.subtitle && <p className="text-slate-600 mb-6">{String(c.subtitle)}</p>}
            <form className="flex gap-2" onSubmit={e => e.preventDefault()}>
              <input type="email" placeholder={(c.placeholder as string) || 'votre@email.fr'} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
              <button type="submit" className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium text-sm transition-colors whitespace-nowrap">
                {(c.button_label as string) || 'S\'inscrire'}
              </button>
            </form>
          </div>
        </section>
      )

    case 'html':
      return c.code
        ? <div dangerouslySetInnerHTML={{ __html: String(c.code) }} />
        : null

    case 'image_text': {
      const imageRight = (c.image_position as string) === 'right'
      return (
        <section className="py-16 px-6 bg-white">
          <div className={`max-w-5xl mx-auto flex flex-col md:flex-row gap-10 items-center ${imageRight ? 'md:flex-row-reverse' : ''}`}>
            {c.image_url && (
              <div className="w-full md:w-1/2 shrink-0">
                <img src={c.image_url as string} alt={(c.image_alt as string) || ''} className="w-full rounded-2xl object-cover" />
              </div>
            )}
            <div className="flex-1">
              {c.title && <h2 className="text-2xl font-bold text-slate-900 mb-4">{String(c.title)}</h2>}
              {c.content && <p className="text-slate-600 leading-relaxed mb-6">{String(c.content)}</p>}
              {c.cta_label && (
                <a href={(c.cta_url as string) || '#'} className="inline-block bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
                  {String(c.cta_label)}
                </a>
              )}
            </div>
          </div>
        </section>
      )
    }

    case 'spacer':
      return <div style={{ height: `${Math.max(8, Number(c.height) || 40)}px` }} />

    case 'button': {
      const alignClass = (c.align as string) === 'left' ? 'text-left' : (c.align as string) === 'right' ? 'text-right' : 'text-center'
      const variantClass = (c.variant as string) === 'secondary'
        ? 'border-2 border-brand-600 text-brand-600 hover:bg-brand-50'
        : (c.variant as string) === 'danger'
        ? 'bg-red-600 hover:bg-red-700 text-white'
        : 'bg-brand-600 hover:bg-brand-700 text-white'
      return (
        <section className={`py-6 px-6 ${alignClass}`}>
          <a
            href={(c.url as string) || '#'}
            target={(c.target_blank as boolean) ? '_blank' : undefined}
            rel={(c.target_blank as boolean) ? 'noopener noreferrer' : undefined}
            className={`inline-block font-semibold px-8 py-3 rounded-xl transition-colors ${variantClass}`}
          >
            {(c.label as string) || 'Bouton'}
          </a>
        </section>
      )
    }

    case 'file_download':
      return (
        <section className="py-8 px-6">
          <div className="max-w-xl mx-auto">
            <a
              href={(c.url as string) || '#'}
              download
              className="flex items-center gap-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl hover:border-brand-500 hover:bg-brand-50 transition-colors group"
            >
              <span className="text-3xl">📥</span>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 group-hover:text-brand-700">{(c.label as string) || 'Télécharger'}</p>
                {c.description && <p className="text-xs text-slate-500 mt-0.5">{String(c.description)}</p>}
              </div>
              <span className="text-slate-400 group-hover:text-brand-500">↓</span>
            </a>
          </div>
        </section>
      )

    case 'blog_listing':
      return (
        <section className="py-16 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            {c.title && <h2 className="text-3xl font-bold text-slate-900 mb-12">{String(c.title)}</h2>}
            <p className="text-slate-400 text-sm text-center py-8 border border-dashed border-slate-200 rounded-xl">
              Les articles seront affichés ici depuis la base de données.
            </p>
          </div>
        </section>
      )

    case 'text':
      return (
        <section className={`py-12 px-6 bg-white text-${(c.align as string) ?? 'left'}`}>
          <div className="max-w-3xl mx-auto prose prose-slate">
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{(c.content as string) || ''}</p>
          </div>
        </section>
      )

    case 'image':
      return c.url ? (
        <section className={`py-8 ${(c.width as string) === 'full' ? '' : 'px-6'}`}>
          {(c.width as string) === 'full' ? (
            <img src={c.url as string} alt={(c.alt as string) || ''} className="w-full" />
          ) : (
            <div className="max-w-3xl mx-auto">
              <img src={c.url as string} alt={(c.alt as string) || ''} className="w-full rounded-2xl object-cover" />
              {c.caption && <p className="text-center text-sm text-slate-500 mt-3">{String(c.caption)}</p>}
            </div>
          )}
        </section>
      ) : null

    case 'divider':
      return (
        <div className="max-w-5xl mx-auto px-6 py-2">
          <div className={`w-full border-t ${(c.style as string) === 'dashed' ? 'border-dashed border-slate-300' : (c.style as string) === 'none' ? 'border-transparent' : 'border-slate-200'}`} />
        </div>
      )

    default:
      return null
  }
}

// ── Helpers ───────────────────────────────────────────────────

function toEmbedUrl(url: string | undefined): string | null {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return url
}

// ── DynamicPage ───────────────────────────────────────────────

export default function DynamicPage({ forceSlug }: { forceSlug?: string }) {
  const { slug: paramSlug } = useParams<{ slug: string }>()
  const slug = forceSlug ?? paramSlug ?? ''
  const { data: page, isLoading, isError } = useDynamicPage(slug)

  useEffect(() => {
    if (!page) return
    document.title = page.seo_title ?? page.title
    let desc = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!desc) {
      desc = document.createElement('meta')
      desc.name = 'description'
      document.head.appendChild(desc)
    }
    desc.content = page.seo_description ?? ''
  }, [page])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError || !page) {
    return <Navigate to="/" replace />
  }

  const blocks = (page.sections ?? []) as unknown as CmsBlock[]

  return (
    <main>
      {blocks.map(block => (
        <RenderBlock key={block.id} block={block} />
      ))}
    </main>
  )
}
