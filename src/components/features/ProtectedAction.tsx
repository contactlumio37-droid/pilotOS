import { ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { useRole } from '@/hooks/useRole'
import type { UserRole } from '@/types/database'

const ROLE_VALUES: Record<UserRole, number> = {
  superadmin: 100,
  admin: 80,
  director: 70,
  manager: 60,
  contributor: 40,
  reader: 20,
  terrain: 10,
}

interface ProtectedActionProps {
  minRole?: UserRole
  fallback?: ReactNode
  children: ReactNode
}

export default function ProtectedAction({
  minRole = 'contributor',
  fallback,
  children,
}: ProtectedActionProps) {
  const role = useRole()
  const userLevel = role ? (ROLE_VALUES[role] ?? 0) : 0
  const required = ROLE_VALUES[minRole] ?? 0

  if (userLevel < required) {
    if (fallback !== undefined) return <>{fallback}</>
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 cursor-not-allowed">
        <Lock className="w-3.5 h-3.5" />
        Lecture seule
      </span>
    )
  }

  return <>{children}</>
}
