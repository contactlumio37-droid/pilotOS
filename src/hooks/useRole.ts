import type { UserRole } from '@/types/database'
import { useAuth } from './useAuth'

const ROLE_HIERARCHY: Record<UserRole, number> = {
  superadmin: 100,
  admin: 80,
  director: 70,
  manager: 60,
  contributor: 40,
  reader: 20,
  terrain: 10,
}

// Role comes from useAuth — already resolved before routes evaluate.
// useOrganisation (React Query) may still be loading when AppRouter first
// renders; reading role from there causes a transient null → /onboarding redirect.
export function useRole(): UserRole | null {
  const { role } = useAuth()
  return role
}

export function useIsAtLeast(minRole: UserRole): boolean {
  const role = useRole()
  if (!role) return false
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole]
}

export function useIsSuperadmin(): boolean {
  return useRole() === 'superadmin'
}

export function useIsManagerOrAbove(): boolean {
  return useIsAtLeast('manager')
}

export function useIsAdminOrAbove(): boolean {
  return useIsAtLeast('admin')
}

// Détermine l'app shell à afficher selon le rôle
export function useAppShell(): 'terrain' | 'contributor' | 'manager' | 'director' | 'admin' | 'superadmin' | null {
  const role = useRole()
  if (!role) return null

  switch (role) {
    case 'superadmin': return 'superadmin'
    case 'admin': return 'admin'
    case 'director': return 'director'
    case 'manager': return 'manager'
    case 'terrain': return 'terrain'
    default: return 'contributor'
  }
}
