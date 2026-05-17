import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CmsPage } from '@/types/database'
import type { CmsBlock } from '@/components/cms/PageEditor'

export function useCmsPage(slug: string) {
  const { data, isLoading, isError, error } = useQuery<CmsPage>({
    queryKey: ['cms_page', slug],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .single()
      if (error) throw error
      return data as CmsPage
    },
  })

  return {
    page: data ?? null,
    sections: (data?.sections ?? []) as unknown as CmsBlock[],
    loading: isLoading,
    error: isError ? (error as Error) : null,
  }
}

// Utility: pick the first block of a given type from a sections array
export function findBlock<T extends CmsBlock>(sections: CmsBlock[], type: T['type']): T | undefined {
  return sections.find(b => b.type === type) as T | undefined
}
