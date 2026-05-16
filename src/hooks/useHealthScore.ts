import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export interface HealthDimension {
  id: string
  label: string
  weight: number
  enabled: boolean
  threshold_green: number
  threshold_amber: number
}

export interface HealthScoreConfig {
  enabled: boolean
  dimensions: HealthDimension[]
}

export const DEFAULT_HEALTH_CONFIG: HealthScoreConfig = {
  enabled: true,
  dimensions: [
    { id: 'actions_on_time',    label: 'Actions à jour',    weight: 25, enabled: true, threshold_green: 80, threshold_amber: 60 },
    { id: 'processes_reviewed', label: 'Processus révisés', weight: 25, enabled: true, threshold_green: 80, threshold_amber: 60 },
    { id: 'docs_valid',         label: 'Documents valides', weight: 25, enabled: true, threshold_green: 90, threshold_amber: 70 },
    { id: 'kpis_met',           label: 'KPIs atteints',     weight: 25, enabled: true, threshold_green: 75, threshold_amber: 50 },
  ],
}

export function useHealthScoreConfig() {
  const { organisation } = useAuth()

  return useQuery({
    queryKey: ['health_score_config', organisation?.id],
    enabled: !!organisation,
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('organisations')
        .select('health_score_config')
        .eq('id', organisation!.id)
        .maybeSingle()
      if (!data?.health_score_config) return DEFAULT_HEALTH_CONFIG
      return data.health_score_config as unknown as HealthScoreConfig
    },
  })
}

export function useSaveHealthScoreConfig() {
  const qc = useQueryClient()
  const { organisation } = useAuth()

  return useMutation({
    mutationFn: async (config: HealthScoreConfig) => {
      const { error } = await supabase
        .from('organisations')
        .update({ health_score_config: config as unknown as Record<string, unknown> })
        .eq('id', organisation!.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health_score_config'] })
      qc.invalidateQueries({ queryKey: ['org_health'] })
    },
  })
}
