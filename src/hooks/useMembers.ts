import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganisation } from '@/hooks/useOrganisation'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import type { UserRole } from '@/types/database'

/**
 * Membres actifs d'une organisation.
 * Accepte un orgId explicite pour fonctionner en contexte superadmin
 * (useAuth().organisation ≠ org consultée).
 */
export function useOrgMembers(orgId?: string) {
  const { organisation: orgFromContext } = useOrganisation()
  // useAuth resolves faster than useOrganisation (no extra query chain)
  // — use it as a fallback so the query starts earlier on first render.
  const { organisation: orgFromAuth } = useAuth()
  const targetOrgId = orgId ?? orgFromContext?.id ?? orgFromAuth?.id

  return useQuery({
    queryKey: ['org-members', targetOrgId],
    enabled: !!targetOrgId,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organisation_members')
        .select(`
          user_id,
          role,
          is_active,
          profiles (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('organisation_id', targetOrgId!)
        .eq('is_active', true)
        .order('role')

      if (error) throw error
      return data ?? []
    },
  })
}

export type OrgMember = NonNullable<
  ReturnType<typeof useOrgMembers>['data']
>[number]

/** Options formatées pour Select ou MultiSelect */
export function useMemberOptions(orgId?: string) {
  const { data: members } = useOrgMembers(orgId)
  return (
    members?.map(m => {
      const p = (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles) as {
        full_name?: string | null
        avatar_url?: string | null
      } | null
      return {
        value: m.user_id,
        label: p?.full_name ?? `Membre (${m.role})`,
        avatar: p?.avatar_url ?? undefined,
        role: m.role,
      }
    }) ?? []
  )
}

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
