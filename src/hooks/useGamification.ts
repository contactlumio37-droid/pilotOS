import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUserStreak,
  getUserBadges,
  updateStreak,
  checkAndAwardBadges,
} from '@/services/gamification.service'
import type { UserStreak, UserBadge } from '@/types/database'
import { useAuth } from './useAuth'
import { useOrganisation } from './useOrganisation'

interface UseGamificationReturn {
  streak:   UserStreak | null
  badges:   UserBadge[]
  loading:  boolean
  recordActivity: () => void
}

export function useGamification(): UseGamificationReturn {
  const { user } = useAuth()
  const { organisation } = useOrganisation()
  const qc = useQueryClient()

  const userId = user?.id
  const orgId  = organisation?.id

  const { data: streak, isLoading: streakLoading } = useQuery({
    queryKey: ['streak', userId, orgId],
    enabled:  !!userId && !!orgId,
    queryFn:  () => getUserStreak(userId!, orgId!),
  })

  const { data: badges = [], isLoading: badgesLoading } = useQuery({
    queryKey: ['badges', userId, orgId],
    enabled:  !!userId && !!orgId,
    queryFn:  () => getUserBadges(userId!, orgId!),
  })

  const activityMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !orgId) return
      const updated = await updateStreak(userId, orgId)
      await checkAndAwardBadges(userId, orgId, updated)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['streak', userId, orgId] })
      qc.invalidateQueries({ queryKey: ['badges', userId, orgId] })
    },
  })

  return {
    streak:   streak ?? null,
    badges,
    loading:  streakLoading || badgesLoading,
    recordActivity: () => activityMutation.mutate(),
  }
}
