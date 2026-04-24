import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganisation } from './useOrganisation'
import type { Module } from '@/types/database'

// Récupère tous les modules actifs pour l'organisation courante
export function useModuleAccess(module: Module): boolean {
  const { organisation } = useOrganisation()

  const { data: isActive = false } = useQuery({
    queryKey: ['module_access', organisation?.id, module],
    queryFn: async () => {
      if (!organisation) return false
      const { data } = await supabase
        .from('module_access')
        .select('is_active')
        .eq('organisation_id', organisation.id)
        .eq('module', module)
        .maybeSingle()
      return data?.is_active ?? false
    },
    enabled: !!organisation,
    staleTime: 60_000, // 1 min — les modules changent rarement
  })

  return isActive
}

// Récupère tous les modules actifs d'un coup
export function useActiveModules(): Module[] {
  const { organisation } = useOrganisation()

  const { data = [] } = useQuery({
    queryKey: ['active_modules', organisation?.id],
    queryFn: async () => {
      if (!organisation) return []
      const { data } = await supabase
        .from('module_access')
        .select('module')
        .eq('organisation_id', organisation.id)
        .eq('is_active', true)
      return (data ?? []).map((row) => row.module as Module)
    },
    enabled: !!organisation,
    staleTime: 60_000,
  })

  return data
}
