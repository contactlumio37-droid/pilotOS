import { Flame } from 'lucide-react'
import type { UserStreak as UserStreakType } from '@/types/database'

interface Props {
  streak: UserStreakType | null
  compact?: boolean
}

export function UserStreak({ streak, compact = false }: Props) {
  const current = streak?.current_streak ?? 0
  const longest = streak?.longest_streak ?? 0

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <Flame className={`w-4 h-4 ${current > 0 ? 'text-orange-500' : 'text-slate-300'}`} />
        <span className={current > 0 ? 'text-orange-600' : 'text-slate-400'}>
          {current}j
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          current > 0 ? 'bg-orange-100' : 'bg-slate-100'
        }`}>
          <Flame className={`w-5 h-5 ${current > 0 ? 'text-orange-500' : 'text-slate-400'}`} />
        </div>
        <div>
          <p className="text-xl font-bold text-slate-900">{current}</p>
          <p className="text-xs text-slate-500">Jours consécutifs</p>
        </div>
      </div>

      <div className="h-8 w-px bg-slate-200" />

      <div>
        <p className="text-xl font-bold text-slate-900">{longest}</p>
        <p className="text-xs text-slate-500">Record personnel</p>
      </div>
    </div>
  )
}
