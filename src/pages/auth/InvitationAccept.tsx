import { useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useInvitation } from '@/hooks/useInvitation'
import { useAuth } from '@/hooks/useAuth'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  manager: 'Manager',
  director: 'Directeur',
  contributor: 'Contributeur',
  terrain: 'Terrain',
  reader: 'Lecteur',
}

export default function InvitationAccept() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { invitation, loading, error, accept } = useInvitation(token)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [password, setPassword]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      setFormError('Prénom et nom requis.')
      return
    }
    if (!user && password.length < 8) {
      setFormError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    setFormError(null)
    setSubmitting(true)
    try {
      await accept({ firstName: firstName.trim(), lastName: lastName.trim(), password: password || undefined })
      navigate('/app', { replace: true })
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Invitation invalide</h1>
          <p className="text-slate-500 text-sm mb-6">
            {error ?? "Cette invitation est invalide, déjà utilisée ou expirée."}
          </p>
          <a href="/login" className="btn-primary inline-block">Se connecter</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✉️</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-1">Vous avez été invité</h1>
            <p className="text-slate-500 text-sm">
              Rejoignez <span className="font-semibold text-slate-700">{invitation.organisation_name}</span>
              {' '}en tant que <span className="font-semibold text-brand-600">{ROLE_LABELS[invitation.role] ?? invitation.role}</span>
            </p>
          </div>

          {formError && (
            <div className="mb-4 bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Prénom *</label>
                <input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="input"
                  placeholder="Alice"
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label className="label">Nom *</label>
                <input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="input"
                  placeholder="Martin"
                  autoComplete="family-name"
                />
              </div>
            </div>

            {!user && (
              <div>
                <label className="label">Mot de passe *</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input"
                  placeholder="8 caractères minimum"
                  autoComplete="new-password"
                />
              </div>
            )}

            {user && (
              <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                Connecté en tant que <span className="font-medium">{user.email}</span>.
                L'invitation sera associée à ce compte.
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full"
            >
              {submitting ? 'Activation en cours…' : 'Rejoindre l\'organisation'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-4">
            Déjà un compte ?{' '}
            <a href="/login" className="text-brand-600 hover:underline">Se connecter</a>
          </p>
        </div>
      </div>
    </div>
  )
}
