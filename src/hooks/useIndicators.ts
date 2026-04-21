import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Indicator, IndicatorValue } from '@/types/database'

export function useIndicators() {
  const { organisation } = useAuth()
  return useQuery({
    queryKey: ['indicators', organisation?.id],
    enabled: !!organisation,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('indicators')
        .select('*')
        .eq('organisation_id', organisation!.id)
        .order('title')
      if (error) throw error
      return data as Indicator[]
    },
  })
}

export function useIndicatorValues(indicatorId: string | null) {
  return useQuery({
    queryKey: ['indicator_values', indicatorId],
    enabled: !!indicatorId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('indicator_values')
        .select('*')
        .eq('indicator_id', indicatorId!)
        .order('measured_at', { ascending: true })
      if (error) throw error
      return data as IndicatorValue[]
    },
  })
}

export function useCreateIndicator() {
  const qc = useQueryClient()
  const { organisation, user } = useAuth()
  return useMutation({
    mutationFn: async (payload: Omit<Indicator, 'id' | 'organisation_id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('indicators')
        .insert({
          ...payload,
          organisation_id: organisation!.id,
          owner_id: payload.owner_id ?? user?.id ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data as Indicator
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['indicators'] }),
  })
}

export function useUpdateIndicator() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Indicator> & { id: string }) => {
      const { data, error } = await supabase
        .from('indicators')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Indicator
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['indicators'] }),
  })
}

export function useAddIndicatorValue() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (payload: Omit<IndicatorValue, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('indicator_values')
        .insert({ ...payload, entered_by: payload.entered_by ?? user?.id ?? null })
        .select()
        .single()
      if (error) throw error
      return data as IndicatorValue
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['indicator_values', vars.indicator_id] })
    },
  })
}
