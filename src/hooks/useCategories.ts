import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export type CategoryType = 'action' | 'process'

export interface Category {
  id: string
  organisation_id: string
  name: string
  color: string
  icon: string
  sort_order: number
  created_at: string
}

function tableFor(type: CategoryType) {
  return type === 'action' ? 'action_categories' : 'process_categories'
}

function linkedTableFor(type: CategoryType) {
  return type === 'action' ? 'actions' : 'processes'
}

function queryKeyFor(type: CategoryType, orgId: string | undefined) {
  return [type === 'action' ? 'action_categories' : 'process_categories', orgId]
}

export function useCategories(type: CategoryType) {
  const { organisation } = useAuth()
  const qc = useQueryClient()
  const table = tableFor(type)
  const linkedTable = linkedTableFor(type)
  const queryKey = queryKeyFor(type, organisation?.id)

  const { data: categories = [], isLoading: loading, error: queryError } = useQuery({
    queryKey,
    enabled: !!organisation,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('organisation_id', organisation!.id)
        .order('sort_order')
      if (error) throw error
      return (data ?? []) as Category[]
    },
  })

  const createMut = useMutation({
    mutationFn: async (payload: { name: string; color: string; icon: string }) => {
      const { data, error } = await supabase
        .from(table)
        .insert({ ...payload, organisation_id: organisation!.id })
        .select()
        .single()
      if (error) throw error
      return data as Category
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  })

  const updateMut = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Category> & { id: string }) => {
      const { data, error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Category
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  })

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const { count, error: countError } = await supabase
        .from(linkedTable)
        .select('*', { count: 'exact', head: true })
        .eq('category_id', id)
      if (countError) throw countError
      const n = count ?? 0
      if (n > 0) {
        const label = type === 'action'
          ? n > 1 ? `${n} actions utilisent` : `1 action utilise`
          : n > 1 ? `${n} processus utilisent` : `1 processus utilise`
        throw new Error(`${label} cette catégorie, suppression impossible. Réaffectez-les d'abord.`)
      }
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  })

  const reorderMut = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, index) =>
          supabase.from(table).update({ sort_order: index }).eq('id', id),
        ),
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  })

  return {
    categories,
    loading,
    error: queryError ? (queryError as Error).message : null,
    create: (data: { name: string; color: string; icon: string }) => createMut.mutateAsync(data),
    update: (id: string, data: Partial<{ name: string; color: string; icon: string; sort_order: number }>) =>
      updateMut.mutateAsync({ id, ...data }),
    remove: (id: string) => removeMut.mutateAsync(id),
    reorder: (orderedIds: string[]) => reorderMut.mutateAsync(orderedIds),
    createPending: createMut.isPending,
    updatePending: updateMut.isPending,
    removePending: removeMut.isPending,
  }
}
