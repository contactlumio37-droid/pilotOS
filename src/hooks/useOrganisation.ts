import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Organisation, OrganisationMember, ModuleAccess } from '@/types/database'
import { useAuth } from './useAuth'

// ── Org context (superadmin org-switching) ───────────────────

export const ORG_CONTEXT_KEY = 'pilotos_org_ctx'
export function setOrgContext(orgId: string): void { sessionStorage.setItem(ORG_CONTEXT_KEY, orgId) }
export function clearOrgContext(): void { sessionStorage.removeItem(ORG_CONTEXT_KEY) }

// ── Hook ─────────────────────────────────────────────────────

interface OrganisationContext {
  organisation: Organisation | null
  member: OrganisationMember | null
  modules: ModuleAccess[]
  loading: boolean
}

export function useOrganisation(): OrganisationContext {
  const { user } = useAuth()
  const ctxOrgId = sessionStorage.getItem(ORG_CONTEXT_KEY)

  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: ['organisation_member', user?.id, ctxOrgId],
    queryFn: async () => {
      if (!user) return null
      let q = supabase
        .from('organisation_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
      if (ctxOrgId) q = q.eq('organisation_id', ctxOrgId)
      const { data, error } = await q.limit(1)
      if (error) return null
      return (data?.[0] ?? null) as OrganisationMember | null
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
