import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganisation } from '@/hooks/useOrganisation'
import { useProfile } from '@/hooks/useProfile'
import { sendInvitationEmail } from '@/lib/email'
import type { UserRole } from '@/types/database'

export function useInviteMember() {
  const qc = useQueryClient()
  const { organisation } = useOrganisation()
  const { data: profile } = useProfile()

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: UserRole }) => {
      if (!organisation) throw new Error('Organisation manquante')

      // Generate invite via Supabase auth (magic link / OTP)
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'invite',
        email,
        options: { redirectTo: `${window.location.origin}/onboarding?org=${organisation.id}` },
      })
      if (linkError) throw linkError

      const userId = linkData.user.id

      // Create member record pre-linked to org
      const { error: memberError } = await supabase
        .from('organisation_members')
        .upsert({
          organisation_id: organisation.id,
          user_id: userId,
          role,
          invited_at: new Date().toISOString(),
          is_active: true,
        }, { onConflict: 'organisation_id,user_id' })
      if (memberError) throw memberError

      // Send invitation email via email.ts wrapper
      const inviteUrl = linkData.properties.action_link
      await sendInvitationEmail({
        to: email,
        inviterName: profile?.full_name ?? 'Un administrateur',
        orgName: organisation.name,
        inviteUrl,
      })
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
