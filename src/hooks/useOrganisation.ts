import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Organisation, OrganisationMember, ModuleAccess } from '@/types/database'
import { useAuth } from './useAuth'

// ── Org context (superadmin org-switching) ────────────────────
export const ORG_CONTEXT_KEY = 'pilotos_org_ctx'
const ORG_CONTEXT_EVENT = 'pilotos-org-changed'

export function setOrgContext(orgId: string): void {
  sessionStorage.setItem(ORG_CONTEXT_KEY, orgId)
  window.dispatchEvent(new Event(ORG_CONTEXT_EVENT))
}

export function clearOrgContext(): void {
  sessionStorage.removeItem(ORG_CONTEXT_KEY)
  window.dispatchEvent(new Event(ORG_CONTEXT_EVENT))
}

// ── Hook ─────────────────────────────────────────────────────

interface OrganisationContext {
  organisation: Organisation | null
  member: OrganisationMember | null
  modules: ModuleAccess[]
  loading: boolean
}

export function useOrganisation(): OrganisationContext {
  const { user } = useAuth()
  const [ctxOrgId, setCtxOrgId] = useState<string | null>(
    () => sessionStorage.getItem(ORG_CONTEXT_KEY),
  )

  useEffect(() => {
    const sync = () => setCtxOrgId(sessionStorage.getItem(ORG_CONTEXT_KEY))
    window.addEventListener(ORG_CONTEXT_EVENT, sync)
    return () => window.removeEventListener(ORG_CONTEXT_EVENT, sync)
  }, [])

  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: ['organisation_member', user?.id, ctxOrgId],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null

      // When org context is active, try that org first
      if (ctxOrgId) {
        const { data: ctxRows } = await supabase
          .from('organisation_members')
          .select('*')
          .eq('user_id', user.id)
          .eq('organisation_id', ctxOrgId)
          .eq('is_active', true)
          .limit(1)
        // If found, use it — otherwise fall through to default
        if (ctxRows?.[0]) return ctxRows[0] as OrganisationMember
      }

      // Default: oldest membership (the user's own original org)
      const { data, error } = await supabase
        .from('organisation_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
      if (error) {
        console.error('[useOrganisation] membership query failed:', error)
        return null
      }
      return (data?.[0] ?? null) as OrganisationMember | null
    },
  })

  const { data: organisation, isLoading: orgLoading } = useQuery({
    queryKey: ['organisation', member?.organisation_id],
    enabled: !!member,
    queryFn: async () => {
      if (!member) return null
      const { data, error } = await supabase
        .from('organisations')
        .select('*')
        .eq('id', member.organisation_id)
        .maybeSingle()
      if (error) {
        console.error('[useOrganisation] org query failed:', error)
        return null
      }
      return data as Organisation | null
    },
  })

  const { data: modules = [] } = useQuery({
    queryKey: ['module_access', member?.organisation_id],
    enabled: !!member,
    queryFn: async () => {
      if (!member) return []
      const { data, error } = await supabase
        .from('module_access')
        .select('*')
        .eq('organisation_id', member.organisation_id)
        .eq('is_active', true)
      if (error) {
        console.error('[useOrganisation] modules query failed:', error)
        return []
      }
      return data as ModuleAccess[]
    },
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
