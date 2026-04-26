import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Profile } from '@/types/database'

export function useProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle()
      if (error) throw error
      return (data ?? null) as Profile | null
    },
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (payload: Partial<Pick<Profile, 'full_name' | 'phone' | 'job_title' | 'avatar_url'>>) => {
      console.log('→ [UpdateProfile]', { userId: user?.id, payload })
      if (!user?.id) {
        console.warn('✗ [UpdateProfile] utilisateur non authentifié')
        throw new Error('Utilisateur non authentifié')
      }
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...payload, updated_at: new Date().toISOString() })
        .select()
        .single()
      if (error) {
        console.error('✗ [UpdateProfile]', error.message)
        throw error
      }
      console.log('✓ [UpdateProfile] enregistré', data)
      return data as Profile
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (newPassword: string) => {
      console.log('→ [ChangePassword]')
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        console.error('✗ [ChangePassword]', error.message)
        throw error
      }
      console.log('✓ [ChangePassword] mot de passe modifié')
    },
  })
}
