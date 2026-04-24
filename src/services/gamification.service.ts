// Gamification service — streak updates and badge awards
import { supabase } from '@/lib/supabase'
import type { UserStreak, UserBadge } from '@/types/database'

// Known badge definitions
export const BADGE_DEFINITIONS: Record<string, { label: string; description: string; emoji: string }> = {
  first_action:      { label: 'Première action',   description: 'A créé sa première action',         emoji: '🎯' },
  streak_7:          { label: 'Semaine de feu',     description: '7 jours de connexion consécutifs',  emoji: '🔥' },
  streak_30:         { label: 'Mois parfait',       description: '30 jours consécutifs',              emoji: '💎' },
  action_10:         { label: 'Actif',              description: '10 actions complétées',             emoji: '✅' },
  action_50:         { label: 'Productif',          description: '50 actions complétées',             emoji: '⚡' },
  process_author:    { label: 'Auteur',             description: 'A créé un processus',               emoji: '📝' },
  kaizen_starter:    { label: 'Améliorateur',       description: 'A lancé un Kaizen',                 emoji: '🚀' },
  document_uploader: { label: 'Archiviste',         description: 'A déposé 5 documents',              emoji: '📂' },
  team_player:       { label: 'Équipier',           description: 'A commenté 10 actions',             emoji: '🤝' },
}

export type BadgeKey = keyof typeof BADGE_DEFINITIONS

export async function getUserStreak(userId: string, organisationId: string): Promise<UserStreak | null> {
  const { data } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', userId)
    .eq('organisation_id', organisationId)
    .maybeSingle()
  return data as UserStreak | null
}

export async function getUserBadges(userId: string, organisationId: string): Promise<UserBadge[]> {
  const { data } = await supabase
    .from('user_badges')
    .select('*')
    .eq('user_id', userId)
    .eq('organisation_id', organisationId)
    .order('earned_at', { ascending: false })
  return (data ?? []) as UserBadge[]
}

// Called on user activity (login, action completed, etc.)
export async function updateStreak(userId: string, organisationId: string): Promise<UserStreak | null> {
  const today = new Date().toISOString().slice(0, 10)

  const { data: existing } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', userId)
    .eq('organisation_id', organisationId)
    .maybeSingle()

  let current_streak = 1
  let longest_streak = 1

  if (existing) {
    const last = existing.last_activity_date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().slice(0, 10)

    if (last === today) {
      // Already recorded today — no change
      return existing as UserStreak
    } else if (last === yesterdayStr) {
      // Consecutive day
      current_streak = existing.current_streak + 1
      longest_streak = Math.max(existing.longest_streak, current_streak)
    } else {
      // Streak broken
      current_streak = 1
      longest_streak = existing.longest_streak
    }
  }

  const { data: updated } = await supabase
    .from('user_streaks')
    .upsert({
      user_id:            userId,
      organisation_id:    organisationId,
      current_streak,
      longest_streak,
      last_activity_date: today,
      updated_at:         new Date().toISOString(),
    }, { onConflict: 'user_id,organisation_id' })
    .select()
    .maybeSingle()

  return updated as UserStreak | null
}

export async function awardBadge(
  userId: string,
  organisationId: string,
  badge: BadgeKey,
): Promise<void> {
  // Idempotent — ignore if already awarded
  const { data: existing } = await supabase
    .from('user_badges')
    .select('id')
    .eq('user_id', userId)
    .eq('organisation_id', organisationId)
    .eq('badge', badge)
    .maybeSingle()

  if (existing) return

  await supabase.from('user_badges').insert({
    user_id:         userId,
    organisation_id: organisationId,
    badge,
  })
}

// Check conditions and award any earned badges — call after significant user actions
export async function checkAndAwardBadges(
  userId: string,
  organisationId: string,
  streak: UserStreak | null,
): Promise<void> {
  const awards: BadgeKey[] = []

  if (streak) {
    if (streak.current_streak >= 7)  awards.push('streak_7')
    if (streak.current_streak >= 30) awards.push('streak_30')
  }

  await Promise.all(awards.map((b) => awardBadge(userId, organisationId, b)))
}
