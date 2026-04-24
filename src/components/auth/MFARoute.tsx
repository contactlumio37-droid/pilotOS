import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useOrganisation } from '@/hooks/useOrganisation'
import { isMFARequired } from '@/hooks/useMFA'

interface MFARouteProps {
  children: React.ReactNode
}

// Redirige vers /mfa/verify si MFA requis et non encore vérifié dans cette session.
// Doit être imbriqué à l'intérieur de <ProtectedRoute>.
export default function MFARoute({ children }: MFARouteProps) {
  const { user, loading, mfaVerified, organisation, role } = useAuth()
  const { member } = useOrganisation()

  // En cours de chargement ou pas connecté → laisser ProtectedRoute gérer
  if (loading || !user || !organisation || !role) return <>{children}</>

  const mfaEnabled = member?.mfa_enabled ?? false
  const required   = isMFARequired(organisation.mfa_policy, role, mfaEnabled)

  if (required && !mfaVerified) {
    return <Navigate to="/mfa/verify" replace />
  }

  return <>{children}</>
}
