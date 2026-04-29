import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Action, ActionStatus, ActionPriority, ActionOrigin, ActionComment } from '@/types/database'

export interface ActionFilters {
  status?: ActionStatus[]
  priority?: ActionPriority[]
  project_id?: string
  responsible_id?: string
  origin?: ActionOrigin[]
  search?: string
  mine?: boolean
}

export interface ActionWithRelations extends Action {
  responsible_profile: { id: string; full_name: string | null; avatar_url: string | null } | null
  accountable_profile: { id: string; full_name: string | null; avatar_url: string | null } | null
  project: { id: string; title: string } | null
}

export interface ActionInsertPayload {
  title: string
  description?: string
  origin: ActionOrigin
  status: ActionStatus
  priority: ActionPriority
  due_date?: string
  responsible_id?: string
  accountable_id?: string
  consulted_ids?: string[]
  informed_ids?: string[]
  project_id?: string
  process_id?: string
  objective_id?: string
  visibility?: Action['visibility']
}

const ACTIONS_KEY = 'actions'

export function useActions(filters?: ActionFilters) {
  const { organisation, user } = useAuth()

  return useQuery({
    queryKey: [ACTIONS_KEY, organisation?.id, filters],
    enabled: !!organisation,
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase
        .from('actions')
        .select(`
          *,
          responsible_profile:profiles!actions_responsible_id_fkey(id, full_name, avatar_url),
          accountable_profile:profiles!actions_accountable_id_fkey(id, full_name, avatar_url),
          project:projects(id, title)
        `)
        .eq('organisation_id', organisation!.id)
        .order('due_date', { ascending: true, nullsFirst: false })

      if (filters?.mine && user) {
        q = q.eq('responsible_id', user.id)
      }
      if (filters?.status?.length) {
        q = q.in('status', filters.status)
      }
      if (filters?.priority?.length) {
        q = q.in('priority', filters.priority)
      }
      if (filters?.origin?.length) {
        q = q.in('origin', filters.origin)
      }
      if (filters?.project_id) {
        q = q.eq('project_id', filters.project_id)
      }
      if (filters?.responsible_id) {
        q = q.eq('responsible_id', filters.responsible_id)
      }
      if (filters?.search) {
        q = q.ilike('title', `%${filters.search}%`)
      }

      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as ActionWithRelations[]
    },
  })
}

export function useMyTodayActions() {
  const { organisation, user } = useAuth()
  const today = new Date().toISOString().slice(0, 10)

  return useQuery({
    queryKey: [ACTIONS_KEY, 'mine-today', organisation?.id, user?.id],
    enabled: !!organisation && !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('actions')
        .select('*')
        .eq('organisation_id', organisation!.id)
        .eq('responsible_id', user!.id)
        .not('status', 'in', '("done","cancelled")')
        .or(`due_date.lte.${today},due_date.is.null`)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(10)
      if (error) throw error
      return (data ?? []) as Action[]
    },
  })
}

export function useActionComments(actionId: string | null) {
  return useQuery({
    queryKey: ['action-comments', actionId],
    enabled: !!actionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('action_comments')
        .select('*, author:profiles!action_comments_user_id_fkey(id, full_name, avatar_url)')
        .eq('action_id', actionId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as (ActionComment & { author: { id: string; full_name: string | null; avatar_url: string | null } | null })[]
    },
  })
}

export function useCreateAction() {
  const qc = useQueryClient()
  const { organisation, user } = useAuth()

  return useMutation({
    mutationFn: async (payload: ActionInsertPayload) => {
      const { data, error } = await supabase
        .from('actions')
        .insert({
          ...payload,
          organisation_id: organisation!.id,
          created_by: user!.id,
          visibility: payload.visibility ?? 'public',
          consulted_ids: payload.consulted_ids ?? [],
          informed_ids: payload.informed_ids ?? [],
        })
        .select()
        .single()
      if (error) throw error
      return data as Action
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [ACTIONS_KEY] }),
  })
}

export function useUpdateAction() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Action> & { id: string }) => {
      const { data, error } = await supabase
        .from('actions')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Action introuvable ou accès refusé par la politique de sécurité')
      return data as Action
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [ACTIONS_KEY] }),
  })
}

export function useAddComment() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ actionId, content }: { actionId: string; content: string }) => {
      const { error } = await supabase
        .from('action_comments')
        .insert({ action_id: actionId, user_id: user!.id, content })
      if (error) throw error
    },
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['action-comments', variables.actionId] }),
  })
}
