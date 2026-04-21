import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { generateActionFromNaturalLanguage, checkAiQuota } from '@/lib/ai'
import type { ActionPriority, ActionOrigin } from '@/types/database'

export interface ActionSuggestion {
  title: string
  description: string
  priority: ActionPriority
  suggestedDueDays: number
  origin: ActionOrigin
}

export function useAiAssist() {
  const { organisation } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fillAction(description: string): Promise<ActionSuggestion | null> {
    if (!organisation) return null
    setLoading(true)
    setError(null)
    try {
      const quota = await checkAiQuota(organisation.id)
      if (!quota.allowed) {
        setError(`Quota IA atteint pour ce mois (plan ${quota.plan}). ${quota.remaining} requête(s) restante(s).`)
        return null
      }
      const result = await generateActionFromNaturalLanguage(description)
      return result as ActionSuggestion
    } catch {
      setError('Erreur lors de la génération IA. Réessayez.')
      return null
    } finally {
      setLoading(false)
    }
  }

  function clearError() {
    setError(null)
  }

  return { loading, error, fillAction, clearError }
}
