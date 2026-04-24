import { BADGE_DEFINITIONS } from '@/services/gamification.service'
import type { UserBadge as UserBadgeType } from '@/types/database'

interface Props {
  badge: UserBadgeType
}

export function UserBadge({ badge }: Props) {
  const def = BADGE_DEFINITIONS[badge.badge] ?? {
    label: badge.badge,
    description: '',
    emoji: '🏅',
  }

  return (
    <div
      className="flex flex-col items-center gap-1 text-center group"
      title={def.description}
    >
      <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
        {def.emoji}
      </div>
      <span className="text-xs font-medium text-slate-700 leading-tight max-w-[60px]">
        {def.label}
      </span>
    </div>
  )
}

interface BadgeListProps {
  badges: UserBadgeType[]
  emptyMessage?: string
}

export function BadgeList({ badges, emptyMessage = 'Aucun badge encore' }: BadgeListProps) {
  if (badges.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic">{emptyMessage}</p>
    )
  }

  return (
    <div className="flex flex-wrap gap-4">
      {badges.map((b) => (
        <UserBadge key={b.id} badge={b} />
      ))}
    </div>
  )
}
