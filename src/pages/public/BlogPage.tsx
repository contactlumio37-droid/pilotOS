import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import SEOHead from '@/components/ui/SEOHead'
import type { BlogPost } from '@/types/database'
import type { Block } from '@/components/editor/BlockEditor'
import { blocksToHtml } from '@/components/editor/blocksToHtml'
import { ArrowLeft, Clock, Calendar } from 'lucide-react'

// ── Hooks ─────────────────────────────────────────────────────

function useBlogPosts() {
  return useQuery({
    queryKey: ['blog_posts_public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_image, cover_image_url, categories, published_at, read_time_minutes, featured, seo_title')
        .eq('published', true)
        .order('published_at', { ascending: false })
      if (error) throw error
      return data as Pick<BlogPost, 'id' | 'title' | 'slug' | 'excerpt' | 'cover_image' | 'cover_image_url' | 'categories' | 'published_at' | 'read_time_minutes' | 'featured' | 'seo_title'>[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

function useBlogPost(slug: string) {
  return useQuery({
    queryKey: ['blog_post_public', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .single()
      if (error) return null
      return data as BlogPost
    },
    staleTime: 5 * 60 * 1000,
  })
}

// ── Blog List ─────────────────────────────────────────────────

function BlogList() {
  const { data: posts = [], isLoading } = useBlogPosts()

  const featured = posts.filter(p => p.featured)
  const regular = posts.filter(p => !p.featured)

  return (
    <main className="min-h-screen bg-white">
      <SEOHead title="Blog PilotOS" description="Actualités, conseils et ressources sur la qualité, la sécurité et le pilotage opérationnel." />

      <div className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-display font-black text-slate-900 mb-4">Blog</h1>
        <p className="text-lg text-slate-500 mb-12">Conseils, actualités et retours d'expérience sur la qualité et la sécurité.</p>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-24 text-slate-400">
            <p className="text-6xl mb-4">✍️</p>
            <p className="text-lg font-medium">Aucun article publié pour l'instant</p>
            <p className="text-sm mt-2">Revenez bientôt !</p>
          </div>
        ) : (
          <>
            {featured.length > 0 && (
              <div className="mb-12">
                {featured.slice(0, 1).map(post => (
                  <Link key={post.id} to={`/blog/${post.slug}`} className="group block">
                    <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white">
                      {(post.cover_image || post.cover_image_url) && (
                        <img
                          src={(post.cover_image || post.cover_image_url)!}
                          alt={post.title}
                          className="w-full h-72 object-cover opacity-50 group-hover:opacity-60 transition-opacity"
                        />
                      )}
                      <div className={`${(post.cover_image || post.cover_image_url) ? 'absolute inset-0' : ''} flex flex-col justify-end p-8`}>
                        {post.categories?.[0] && (
                          <span className="inline-block text-xs bg-brand-600 text-white px-3 py-1 rounded-full mb-3 w-fit">
                            {post.categories[0]}
                          </span>
                        )}
                        <h2 className="text-2xl font-bold mb-2 group-hover:text-brand-300 transition-colors">{post.title}</h2>
                        {post.excerpt && <p className="text-slate-300 text-sm line-clamp-2">{post.excerpt}</p>}
                        <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
                          {post.published_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(post.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                          )}
                          {post.read_time_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {post.read_time_minutes} min
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regular.map(post => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group card card-hover flex flex-col">
                  {(post.cover_image || post.cover_image_url) && (
                    <img
                      src={(post.cover_image || post.cover_image_url)!}
                      alt={post.title}
                      className="w-full h-40 object-cover rounded-xl mb-4"
                    />
                  )}
                  {post.categories?.[0] && (
                    <span className="text-xs text-brand-600 font-medium mb-2">{post.categories[0]}</span>
                  )}
                  <h2 className="font-semibold text-slate-900 group-hover:text-brand-700 transition-colors mb-2 line-clamp-2">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-sm text-slate-500 line-clamp-3 flex-1">{post.excerpt}</p>
                  )}
                  <div className="flex items-center gap-3 mt-4 text-xs text-slate-400">
                    {post.published_at && (
                      <span>{new Date(post.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                    )}
                    {post.read_time_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.read_time_minutes} min
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}

// ── Blog Post ─────────────────────────────────────────────────

function BlogPostPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const { data: post, isLoading } = useBlogPost(slug)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-slate-500">
        <p className="text-5xl">🔍</p>
        <p className="text-lg font-medium">Article introuvable</p>
        <Link to="/blog" className="text-brand-600 hover:text-brand-700 text-sm flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          Retour au blog
        </Link>
      </div>
    )
  }

  const blocks = (post.content_blocks ?? []) as unknown as Block[]
  const contentHtml = blocksToHtml(blocks)

  return (
    <main className="min-h-screen bg-white">
      <SEOHead
        title={post.seo_title ?? post.title}
        description={post.excerpt ?? undefined}
        ogImage={(post.cover_image || post.cover_image_url) ?? undefined}
        ogType="article"
      />

      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Blog
        </Link>

        {post.categories?.[0] && (
          <span className="inline-block text-xs bg-brand-50 text-brand-700 font-medium px-3 py-1 rounded-full mb-4">
            {post.categories[0]}
          </span>
        )}

        <h1 className="text-3xl md:text-4xl font-display font-black text-slate-900 mb-4 leading-tight">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="text-lg text-slate-500 mb-6 leading-relaxed">{post.excerpt}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-slate-400 pb-6 border-b border-slate-100 mb-8">
          {post.published_at && (
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(post.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          )}
          {post.read_time_minutes && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {post.read_time_minutes} min de lecture
            </span>
          )}
        </div>

        {(post.cover_image || post.cover_image_url) && (
          <img
            src={(post.cover_image || post.cover_image_url)!}
            alt={post.title}
            className="w-full rounded-2xl object-cover mb-10 max-h-80"
          />
        )}

        {contentHtml ? (
          <div
            className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        ) : (
          <p className="text-slate-400 italic">Contenu non disponible.</p>
        )}

        <div className="mt-16 pt-8 border-t border-slate-100">
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 transition-colors font-medium">
            <ArrowLeft className="w-4 h-4" />
            Voir tous les articles
          </Link>
        </div>
      </div>
    </main>
  )
}

// ── Exports ───────────────────────────────────────────────────

export { BlogList, BlogPostPage }
export default BlogList
