import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Organisation, OrganisationMember, ModuleAccess } from '@/types/database'
import { useAuth } from './useAuth'

interface OrganisationContext {
  organisation: Organisation | null
  member: OrganisationMember | null
  modules: ModuleAccess[]
  loading: boolean
}

export function useOrganisation(): OrganisationContext {
  const { user } = useAuth()

  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: ['organisation_member', user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data, error } = await supabase
        .from('organisation_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
      if (error) return null
      return data as OrganisationMember
    },
    enabled: !!user,
  })

  const { data: organisation, isLoading: orgLoading } = useQuery({
    queryKey: ['organisation', member?.organisation_id],
    queryFn: async () => {
      if (!member) return null
      const { data, error } = await supabase
        .from('organisations')
        .select('*')
        .eq('id', member.organisation_id)
        .single()
      if (error) return null
      return data as Organisation
    },
    enabled: !!member,
  })

  const { data: modules = [] } = useQuery({
    queryKey: ['module_access', member?.organisation_id],
    queryFn: async () => {
      if (!member) return []
      const { data, error } = await supabase
        .from('module_access')
        .select('*')
        .eq('organisation_id', member.organisation_id)
        .eq('is_active', true)
      if (error) return []
      return data as ModuleAccess[]
    },
    enabled: !!member,
  })

  return {
    organisation: organisation ?? null,
    member: member ?? null,
    modules,
    loading: memberLoading || orgLoading,
  }
}

export function useHasModule(moduleName: string): boolean {
  const { modules } = useOrganisation()
  return modules.some((m) => m.module === moduleName && m.is_active)
}
