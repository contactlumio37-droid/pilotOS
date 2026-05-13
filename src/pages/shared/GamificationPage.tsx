import { motion } from 'framer-motion'
import { Flame, Trophy, Star, Award, Zap, Inbox } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import PageHeader from '@/components/layout/PageHeader'
import { useGamification } from '@/hooks/useGamification'
import { BADGE_DEFINITIONS } from '@/services/gamification.service'
import type { UserBadge } from '@/types/database'

function BadgeCard({ badge }: { badge: UserBadge }) {
  const def = BADGE_DEFINITIONS[badge.badge] ?? {
    label: badge.badge,
    description: '',
    emoji: '🏅',
  }
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card flex flex-col items-center text-center p-5 gap-2"
    >
      <span className="text-4xl">{def.emoji}</span>
      <p className="font-semibold text-slate-800 text-sm">{def.label}</p>
      <p className="text-xs text-slate-400">{def.description}</p>
      <p className="text-xs text-slate-300 mt-1">
        {format(new Date(badge.earned_at), 'd MMM yyyy', { locale: fr })}
      </p>
    </motion.div>
  )
}

function LockedBadgeCard({ badgeKey }: { badgeKey: string }) {
  const def = BADGE_DEFINITIONS[badgeKey]
  if (!def) return null
  return (
    <div className="card flex flex-col items-center text-center p-5 gap-2 opacity-40 grayscale">
      <span className="text-4xl">{def.emoji}</span>
      <p className="font-semibold text-slate-800 text-sm">{def.label}</p>
      <p className="text-xs text-slate-400">{def.description}</p>
      <p className="text-xs text-slate-300 mt-1">Non débloqué</p>
    </div>
  )
}

export default function GamificationPage() {
  const { streak, badges, loading } = useGamification()

  const earnedKeys = new Set(badges.map(b => b.badge))
  const allKeys    = Object.keys(BADGE_DEFINITIONS)
  const lockedKeys = allKeys.filter(k => !earnedKeys.has(k))

  const streakDays = streak?.current_streak ?? 0
  const longestDays = streak?.longest_streak ?? 0

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Progression"
        subtitle="Vos badges, série et accomplissements"
      />

      {/* Streak cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center">
            <Flame className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{streakDays}</p>
            <p className="text-xs text-slate-500">Jours consécutifs</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{longestDays}</p>
            <p className="text-xs text-slate-500">Record personnel</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-brand-100 flex items-center justify-center">
            <Award className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{badges.length}</p>
            <p className="text-xs text-slate-500">Badges débloqués</p>
          </div>
        </div>
      </div>

      {/* Streak visual bar */}
      {streakDays > 0 && (
        <div className="card p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-brand-600" />
            <p className="font-semibold text-slate-700 text-sm">Série en cours</p>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: Math.min(streakDays, 30) }).map((_, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded bg-orange-400 flex items-center justify-center"
                title={`Jour ${i + 1}`}
              >
                <Flame className="w-3 h-3 text-white" />
              </div>
            ))}
            {streakDays > 30 && (
              <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                +{streakDays - 30}
              </div>
            )}
          </div>
          {streak?.last_activity_date && (
            <p className="text-xs text-slate-400 mt-2">
              Dernière activité : {format(new Date(streak.last_activity_date), 'd MMM yyyy', { locale: fr })}
            </p>
          )}
        </div>
      )}

      {/* Earned badges */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-4 h-4 text-amber-500" />
          <h2 className="font-semibold text-slate-700">Badges obtenus ({badges.length})</h2>
        </div>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card animate-pulse h-32" />
            ))}
          </div>
        )}

        {!loading && badges.length === 0 && (
          <div className="card text-center py-10">
            <Inbox className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Aucun badge encore</p>
            <p className="text-sm text-slate-400 mt-1">
              Complétez des actions, créez des processus et revenez chaque jour pour débloquer des badges.
            </p>
          </div>
        )}

        {!loading && badges.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {badges.map(b => <BadgeCard key={b.id} badge={b} />)}
          </div>
        )}
      </div>

      {/* Locked badges */}
      {lockedKeys.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-slate-300" />
            <h2 className="font-semibold text-slate-400">À débloquer ({lockedKeys.length})</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {lockedKeys.map(k => <LockedBadgeCard key={k} badgeKey={k} />)}
          </div>
        </div>
      )}
    </div>
  )
}
