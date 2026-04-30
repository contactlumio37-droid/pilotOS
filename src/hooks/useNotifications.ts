import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Notification } from '@/types/database'

export function useNotifications() {
  const { user, organisation } = useAuth()
  return useQuery({
    queryKey: ['notifications', user?.id],
    enabled: !!user && !!organisation,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .or(`organisation_id.eq.${organisation!.id},organisation_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(30)
      if (error) throw error
      return data as Notification[]
    },
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', user?.id] }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  const { user, organisation } = useAuth()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user!.id)
        .eq('organisation_id', organisation!.id)
        .eq('read', false)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', user?.id] }),
  })
}
