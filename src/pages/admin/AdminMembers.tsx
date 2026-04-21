import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { UserPlus, Mail, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganisation } from '@/hooks/useOrganisation'
import { useAuth } from '@/hooks/useAuth'
import { sendInvitationEmail } from '@/lib/email'
import type { OrganisationMember, Profile, MemberInvitation, UserRole } from '@/types/database'

type MemberWithProfile = OrganisationMember & { profile: Profile | null }
type PendingInvite = Pick<MemberInvitation, 'id' | 'email' | 'role' | 'created_at'>

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Administrateur',
  manager: 'Manager',
  director: 'Directeur',
  contributor: 'Contributeur',
  terrain: 'Terrain',
  reader: 'Lecteur',
}

const INVITABLE_ROLES: UserRole[] = ['admin', 'manager', 'director', 'contributor', 'terrain', 'reader']

export default function AdminMembers() {
  const { organisation } = useOrganisation()
  const { user, profile: myProfile } = useAuth()
  const queryClient = useQueryClient()
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('contributor')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members', organisation?.id],
    queryFn: async () => {
      if (!organisation) return []
      const { data, error } = await supabase
        .from('organisation_members')
        .select('*, profile:profiles(*)')
        .eq('organisation_id', organisation.id)
        .eq('is_active', true)
        .order('role')
      if (error) throw error
      return data as MemberWithProfile[]
    },
    enabled: !!organisation,
  })

  const { data: pendingInvites = [] } = useQuery({
    queryKey: ['pending-invites', organisation?.id],
    queryFn: async () => {
      if (!organisation) return []
      const { data, error } = await supabase
        .from('member_invitations')
        .select('id, email, role, created_at')
        .eq('organisation_id', organisation.id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as PendingInvite[]
    },
    enabled: !!organisation,
  })

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: UserRole }) => {
      if (!organisation || !user) throw new Error('Non authentifié')

      const { error } = await supabase
        .from('member_invitations')
        .insert({ organisation_id: organisation.id, email, role, invited_by: user.id })

      if (error) {
        if (error.code === '23505') throw new Error('Une invitation est déjà en attente pour cet email.')
        throw new Error(error.message)
      }

      try {
        await sendInvitationEmail({
          to: email,
          inviterName: myProfile?.full_name ?? 'Un administrateur',
          orgName: organisation.name,
          inviteUrl: `${window.location.origin}/register`,
        })
      } catch {
        // Email non bloquant — invitation créée en base même sans envoi
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites', organisation?.id] })
      setInviteSuccess(true)
      setInviteEmail('')
      setInviteRole('contributor')
      setTimeout(() => { setShowInvite(false); setInviteSuccess(false) }, 2000)
    },
    onError: (err: Error) => setInviteError(err.message),
  })

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError(null)
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole })
  }

  function openInvite() {
    setShowInvite(true)
    setInviteError(null)
    setInviteSuccess(false)
  }

  const totalCount = members.length + pendingInvites.length

  return (
    <div className="max-w-4xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Membres</h1>
            <p className="text-slate-500 text-sm mt-1">
              {members.length} membre{members.length !== 1 ? 's' : ''} actif{members.length !== 1 ? 's' : ''}
              {pendingInvites.length > 0 && ` · ${pendingInvites.length} invitation${pendingInvites.length !== 1 ? 's' : ''} en attente`}
            </p>
          </div>
          <button className="btn-primary" onClick={openInvite}>
            <UserPlus className="w-4 h-4" />
            Inviter
          </button>
        </div>

        {showInvite && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-slate-900">Inviter un membre</h2>
                <button onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {inviteSuccess ? (
                <div className="text-center py-6">
                  <div className="text-5xl mb-3">✓</div>
                  <p className="font-semibold text-slate-900">Invitation envoyée</p>
                  <p className="text-sm text-slate-500 mt-1">
                    L'utilisateur recevra un email avec les instructions.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleInvite} className="space-y-4">
                  {inviteError && (
                    <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">
                      {inviteError}
                    </div>
                  )}
                  <div>
                    <label className="label">Adresse email</label>
                    <input
                      type="email"
                      className="input"
                      placeholder="collaborateur@entreprise.fr"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="label">Rôle</label>
                    <select
                      className="input"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    >
                      {INVITABLE_ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setShowInvite(false)} className="btn-secondary flex-1">
                      Annuler
                    </button>
                    <button type="submit" disabled={inviteMutation.isPending} className="btn-primary flex-1">
                      {inviteMutation.isPending ? 'Envoi…' : "Envoyer l'invitation"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3">Membre</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3">Rôle</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold">
                          {(member.profile?.full_name ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{member.profile?.full_name ?? '—'}</p>
                          {member.profile?.job_title && (
                            <p className="text-xs text-slate-400">{member.profile.job_title}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge badge-brand">{ROLE_LABELS[member.role] ?? member.role}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${member.accepted_at ? 'badge-success' : 'badge-warning'}`}>
                        {member.accepted_at ? 'Actif' : 'En attente'}
                      </span>
                    </td>
                  </tr>
                ))}
                {pendingInvites.map((invite) => (
                  <tr key={invite.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                          <Mail className="w-4 h-4" />
                        </div>
                        <p className="text-sm text-slate-600">{invite.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge badge-neutral">{ROLE_LABELS[invite.role] ?? invite.role}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge badge-warning">Invitation envoyée</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalCount === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Mail className="w-8 h-8 mx-auto mb-3" />
                <p>Aucun membre — invitez votre équipe !</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}
