import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type {
  Process, ProcessInsert,
  NonConformity, NcSeverity, NcStatus,
  KaizenPlan, KaizenStatus,
  ProcessReview,
} from '@/types/database'

// ── Processes ────────────────────────────────────────────────

export function useProcesses() {
  const { organisation } = useAuth()
  return useQuery({
    queryKey: ['processes', organisation?.id],
    enabled: !!organisation,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processes')
        .select('*')
        .eq('organisation_id', organisation!.id)
        .neq('status', 'deprecated')
        .order('process_type')
        .order('title')
      if (error) throw error
      return data as Process[]
    },
  })
}

export function useCreateProcess() {
  const qc = useQueryClient()
  const { organisation, user } = useAuth()
  return useMutation({
    mutationFn: async (payload: Omit<ProcessInsert, 'organisation_id'>) => {
      const { data, error } = await supabase
        .from('processes')
        .insert({ ...payload, organisation_id: organisation!.id, owner_id: payload.owner_id ?? user?.id })
        .select()
        .single()
      if (error) throw error
      return data as Process
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['processes'] }),
  })
}

export function useUpdateProcess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Process> & { id: string }) => {
      const { data, error } = await supabase
        .from('processes')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Process
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['processes'] }),
  })
}

// ── Non-conformities ─────────────────────────────────────────

export interface NcFilters {
  process_id?: string
  status?: NcStatus[]
  severity?: NcSeverity[]
}

export function useNonConformities(filters?: NcFilters) {
  const { organisation } = useAuth()
  return useQuery({
    queryKey: ['non_conformities', organisation?.id, filters],
    enabled: !!organisation,
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase
        .from('non_conformities')
        .select('*')
        .eq('organisation_id', organisation!.id)
        .order('detected_at', { ascending: false })
      if (filters?.process_id) q = q.eq('process_id', filters.process_id)
      if (filters?.status?.length) q = q.in('status', filters.status)
      if (filters?.severity?.length) q = q.in('severity', filters.severity)
      const { data, error } = await q
      if (error) throw error
      return data as NonConformity[]
    },
  })
}

export function useCreateNC() {
  const qc = useQueryClient()
  const { organisation, user } = useAuth()
  return useMutation({
    mutationFn: async (payload: Omit<NonConformity, 'id' | 'organisation_id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('non_conformities')
        .insert({
          ...payload,
          organisation_id: organisation!.id,
          detected_by: payload.detected_by ?? user?.id ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data as NonConformity
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['non_conformities'] }),
  })
}

export function useUpdateNC() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<NonConformity> & { id: string }) => {
      const { data, error } = await supabase
        .from('non_conformities')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as NonConformity
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['non_conformities'] }),
  })
}

// ── Kaizen plans ─────────────────────────────────────────────

export interface KaizenFilters {
  process_id?: string
  status?: KaizenStatus[]
}

export function useKaizenPlans(filters?: KaizenFilters) {
  const { organisation } = useAuth()
  return useQuery({
    queryKey: ['kaizen_plans', organisation?.id, filters],
    enabled: !!organisation,
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase
        .from('kaizen_plans')
        .select('*')
        .eq('organisation_id', organisation!.id)
        .order('created_at', { ascending: false })
      if (filters?.process_id) q = q.eq('process_id', filters.process_id)
      if (filters?.status?.length) q = q.in('status', filters.status)
      const { data, error } = await q
      if (error) throw error
      return data as KaizenPlan[]
    },
  })
}

export function useCreateKaizen() {
  const qc = useQueryClient()
  const { organisation, user } = useAuth()
  return useMutation({
    mutationFn: async (payload: Omit<KaizenPlan, 'id' | 'organisation_id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('kaizen_plans')
        .insert({
          ...payload,
          organisation_id: organisation!.id,
          created_by: payload.created_by ?? user?.id ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data as KaizenPlan
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kaizen_plans'] }),
  })
}

export function useUpdateKaizen() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<KaizenPlan> & { id: string }) => {
      const { data, error } = await supabase
        .from('kaizen_plans')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as KaizenPlan
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kaizen_plans'] }),
  })
}

// ── Process reviews ──────────────────────────────────────────

export function useProcessReviews(processId?: string) {
  const { organisation } = useAuth()
  return useQuery({
    queryKey: ['process_reviews', organisation?.id, processId],
    enabled: !!organisation,
    queryFn: async () => {
      let q = supabase.from('process_reviews').select('*')
        .eq('organisation_id', organisation!.id)
        .order('review_date', { ascending: false })
      if (processId) q = q.eq('process_id', processId)
      const { data, error } = await q
      if (error) throw error
      return data as ProcessReview[]
    },
  })
}
