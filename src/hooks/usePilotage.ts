import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { StrategicObjective, CodirDecision, Project, Visibility } from '@/types/database'

// ─── Strategic Objectives ────────────────────────────────────────────────────

export function useObjectives() {
  const { organisation } = useAuth()

  return useQuery({
    queryKey: ['objectives', organisation?.id],
    enabled: !!organisation,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_objectives')
        .select('*')
        .eq('organisation_id', organisation!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as StrategicObjective[]
    },
  })
}

export interface ObjectivePayload {
  title: string
  description?: string
  axis?: string
  status: StrategicObjective['status']
  kpi_label?: string
  kpi_target?: number
  kpi_unit?: string
  start_date?: string
  end_date?: string
  owner_id?: string
  visibility: Visibility
  visibility_user_ids?: string[]
}

export function useCreateObjective() {
  const qc = useQueryClient()
  const { organisation } = useAuth()

  return useMutation({
    mutationFn: async (payload: ObjectivePayload) => {
      const { data, error } = await supabase
        .from('strategic_objectives')
        .insert({
          ...payload,
          organisation_id: organisation!.id,
          visibility_user_ids: payload.visibility_user_ids ?? [],
        })
        .select()
        .single()
      if (error) throw error
      return data as StrategicObjective
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['objectives'] }),
  })
}

export function useUpdateObjective() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ObjectivePayload> & { id: string }) => {
      const { error } = await supabase
        .from('strategic_objectives')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['objectives'] }),
  })
}

// ─── CODIR Decisions ─────────────────────────────────────────────────────────

export function useCodirDecisions() {
  const { organisation } = useAuth()

  return useQuery({
    queryKey: ['codir', organisation?.id],
    enabled: !!organisation,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('codir_decisions')
        .select('*')
        .eq('organisation_id', organisation!.id)
        .order('decision_date', { ascending: false })
      if (error) throw error
      return (data ?? []) as CodirDecision[]
    },
  })
}

export function useCreateCodirDecision() {
  const qc = useQueryClient()
  const { organisation, user } = useAuth()

  return useMutation({
    mutationFn: async (payload: {
      title: string
      description?: string
      decision_date: string
      objective_id?: string
      visibility: Visibility
      visibility_user_ids?: string[]
    }) => {
      const { data, error } = await supabase
        .from('codir_decisions')
        .insert({
          ...payload,
          organisation_id: organisation!.id,
          author_id: user!.id,
          visibility_user_ids: payload.visibility_user_ids ?? [],
        })
        .select()
        .single()
      if (error) throw error
      return data as CodirDecision
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['codir'] }),
  })
}

// ─── Projects ────────────────────────────────────────────────────────────────

export function useProjects() {
  const { organisation } = useAuth()

  return useQuery({
    queryKey: ['projects', organisation?.id],
    enabled: !!organisation,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`*, objective:strategic_objectives(id, title)`)
        .eq('organisation_id', organisation!.id)
        .not('status', 'in', '("cancelled")')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as (Project & { objective: { id: string; title: string } | null })[]
    },
  })
}
