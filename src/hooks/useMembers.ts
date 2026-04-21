import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganisation } from '@/hooks/useOrganisation'
import { useProfile } from '@/hooks/useProfile'
import type { UserRole } from '@/types/database'

export function useInviteMember() {
  const qc = useQueryClient()
  const { organisation } = useOrganisation()
  const { data: profile } = useProfile()

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: UserRole }) => {
      if (!organisation) throw new Error('Organisation manquante')

      // Appel à l'Edge Function invite-member (côté serveur, utilise service_role)
      const { error } = await supabase.functions.invoke('invite-member', {
        body: {
          email,
          role,
          organisationId: organisation.id,
          orgName: organisation.name,
          inviterName: profile?.full_name ?? 'Un administrateur',
          redirectTo: `${window.location.origin}/onboarding`,
        },
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  })
}

export function useUpdateMemberRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: UserRole }) => {
      const { error } = await supabase
        .from('organisation_members')
        .update({ role })
        .eq('id', memberId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  })
}

export function useDeactivateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('organisation_members')
        .update({ is_active: false })
        .eq('id', memberId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  })
}
