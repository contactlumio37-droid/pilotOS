import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export interface ActionCategory {
  id: string
  organisation_id: string
  name: string
  color: string
  icon: string
  is_default: boolean
  sort_order: number
  created_at: string
}

const KEY = 'action_categories'

export function useActionCategories() {
  const { organisation } = useAuth()

  return useQuery({
    queryKey: [KEY, organisation?.id],
    enabled: !!organisation,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('action_categories')
        .select('*')
        .eq('organisation_id', organisation!.id)
        .order('sort_order')
      if (error) throw error
      return (data ?? []) as ActionCategory[]
    },
  })
}

export function useCreateActionCategory() {
  const qc = useQueryClient()
  const { organisation } = useAuth()

  return useMutation({
    mutationFn: async (payload: { name: string; color: string; icon: string }) => {
      const { data, error } = await supabase
        .from('action_categories')
        .insert({ ...payload, organisation_id: organisation!.id })
        .select()
        .single()
      if (error) throw error
      return data as ActionCategory
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useUpdateActionCategory() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<ActionCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('action_categories')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as ActionCategory
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteActionCategory() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // Vérifie qu'aucune action n'est liée avant de supprimer
      const { count, error: countError } = await supabase
        .from('actions')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', id)
      if (countError) throw countError
      if ((count ?? 0) > 0) {
        throw new Error(
          `Impossible de supprimer : ${count} action${(count ?? 0) > 1 ? 's sont liées' : ' est liée'} à cette catégorie.`,
        )
      }
      const { error } = await supabase.from('action_categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useReorderActionCategories() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase.from('action_categories').update({ sort_order: index + 1 }).eq('id', id),
      )
      await Promise.all(updates)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
