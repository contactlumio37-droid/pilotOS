import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface NavItem {
  id: string
  label: string
  url: string
  sort_order: number
  is_visible: boolean
}

export function useCmsNavItems() {
  return useQuery({
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
}

export function useAddNavItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { label: string; url: string; sort_order: number }) => {
      const { error } = await supabase
        .from('cms_nav_items')
        .insert({ ...payload, is_visible: true })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms_nav_items'] }),
  })
}

export function useDeleteNavItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cms_nav_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms_nav_items'] }),
  })
}

export function useToggleNavItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_visible }: { id: string; is_visible: boolean }) => {
      const { error } = await supabase
        .from('cms_nav_items')
        .update({ is_visible })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms_nav_items'] }),
  })
}

export function useSaveNavOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]) => {
      await Promise.all(
        items.map((item) =>
          supabase
            .from('cms_nav_items')
            .update({ sort_order: item.sort_order })
            .eq('id', item.id),
        ),
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms_nav_items'] }),
  })
}
