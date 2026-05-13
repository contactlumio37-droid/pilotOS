import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export function useCreateTerrainReport() {
  const qc = useQueryClient()
  const { user, organisation } = useAuth()
  return useMutation({
    mutationFn: async (payload: {
      title: string
      location?: string | null
      description?: string | null
      category: string
    }) => {
      const { data, error } = await supabase
        .from('terrain_reports')
        .insert({
          organisation_id: organisation!.id,
          reported_by: user!.id,
          title: payload.title,
          location: payload.location ?? null,
          description: payload.description ?? null,
          category: payload.category,
          status: 'pending',
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['terrain_reports'] }),
  })
}
