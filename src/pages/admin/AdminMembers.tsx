import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, Mail, X, UserMinus, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganisation } from '@/hooks/useOrganisation'
import { useInviteMember, useUpdateMemberRole, useDeactivateMember } from '@/hooks/useMembers'
import Drawer from '@/components/ui/Drawer'
import type { OrganisationMember, Profile, UserRole } from '@/types/database'

type MemberWithProfile = OrganisationMember & { profile: Profile | null }

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'terrain',     label: 'Terrain' },
  { value: 'contributor', label: 'Contributeur' },
  { value: 'manager',     label: 'Manager' },
  { value: 'director',    label: 'Directeur' },
  { value: 'admin',       label: 'Administrateur' },
]

const ROLE_BADGE: Record<string, string> = {
  superadmin:  'badge bg-red-100 text-red-700',
  admin:       'badge badge-danger',
  manager:     'badge badge-brand',
  director:    'badge badge-brand',
  contributor: 'badge badge-neutral',
  terrain:     'badge bg-slate-100 text-slate-500',
  reader:      'badge bg-slate-100 text-slate-400',
}

const inviteSchema = z.object({
  email: z.string().email('Email invalide'),
  role:  z.enum(['terrain', 'contributor', 'manager', 'director', 'admin'] as const),
})
type InviteForm = z.infer<typeof inviteSchema>

export default function AdminMembers() {
  const { organisation } = useOrganisation()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)

  const inviteMember   = useInviteMember()
  const updateRole     = useUpdateMemberRole()
  const deactivate     = useDeactivateMember()

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

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'contributor' },
  })

  async function onInvite(data: InviteForm) {
    try {
      await inviteMember.mutateAsync({ email: data.email, role: data.role })
      reset()
      setInviteSent(true)
      setTimeout(() => { setInviteSent(false); setInviteOpen(false) }, 2000)
    } catch { /* mutation handles error */ }
  }

  return (
    <div className="max-w-4xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Membres</h1>
            <p className="text-slate-500 text-sm mt-1">
              {members.length} membre{members.length > 1 ? 's' : ''} actif{members.length > 1 ? 's' : ''}
              {organisation && ` · ${organisation.seats_included + organisation.seats_extra} sièges disponibles`}
            </p>
          </div>
          <button onClick={() => setInviteOpen(true)} className="btn-primary flex items-center gap-1.5">
            <UserPlus className="w-4 h-4" />
            Inviter
          </button>
        </div>

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
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3">
                    Membre
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3">
                    Rôle
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3">
                    Statut
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold shrink-0">
                          {(member.profile?.full_name ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {member.profile?.full_name ?? '—'}
                          </p>
                          {member.profile?.job_title && (
                            <p className="text-xs text-slate-400">{member.profile.job_title}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {member.role === 'superadmin' ? (
                        <span className={ROLE_BADGE[member.role]}>Super Admin</span>
                      ) : (
                        <select
                          defaultValue={member.role}
                          onChange={e => updateRole.mutate({ memberId: member.id, role: e.target.value as UserRole })}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700"
                        >
                          {ROLE_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`badge ${member.accepted_at ? 'badge-success' : 'badge-warning'}`}>
                          {member.accepted_at ? 'Actif' : 'Invitation envoyée'}
                        </span>
                        {member.mfa_enabled && (
                          <ShieldCheck className="w-4 h-4 text-success-600" aria-label="MFA activé" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {member.role !== 'superadmin' && (
                        <button
                          onClick={() => deactivate.mutate(member.id)}
                          className="text-slate-400 hover:text-danger transition-colors"
                          title="Désactiver ce membre"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {members.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Mail className="w-8 h-8 mx-auto mb-3" />
                <p>Aucun membre — invitez votre équipe !</p>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Invite Drawer */}
      <Drawer
        open={inviteOpen}
        onClose={() => { setInviteOpen(false); reset(); setInviteSent(false) }}
        title="Inviter un membre"
        footer={
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setInviteOpen(false); reset() }}
              className="btn-secondary flex items-center gap-1.5"
            >
              <X className="w-4 h-4" /> Annuler
            </button>
            <button
              type="submit"
              form="invite-form"
              disabled={inviteMember.isPending || inviteSent}
              className="btn-primary flex items-center gap-1.5"
            >
              <Mail className="w-4 h-4" />
              {inviteSent ? 'Invitation envoyée ✓' : inviteMember.isPending ? 'Envoi…' : 'Envoyer l\'invitation'}
            </button>
          </div>
        }
      >
        <form id="invite-form" onSubmit={handleSubmit(onInvite)} className="space-y-4">
          <div>
            <label className="label">Adresse email *</label>
            <input
              {...register('email')}
              type="email"
              className="input"
              placeholder="prenom.nom@entreprise.fr"
              autoComplete="email"
            />
            {errors.email && <p className="text-xs text-danger-500 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label">Rôle *</label>
            <select {...register('role')} className="input">
              {ROLE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Le rôle peut être modifié ultérieurement.
            </p>
          </div>

          {inviteMember.isError && (
            <p className="text-sm text-danger-500">
              Erreur lors de l'invitation. Vérifiez que cet email n'est pas déjà membre.
            </p>
          )}

          <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-500">
            L'invité recevra un email avec un lien pour rejoindre{' '}
            <strong className="text-slate-700">{organisation?.name}</strong>. Le lien est valide 7 jours.
          </div>
        </form>
      </Drawer>
    </div>
  )
}
