import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { UserPlus, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganisation } from '@/hooks/useOrganisation'
import type { OrganisationMember, Profile } from '@/types/database'

type MemberWithProfile = OrganisationMember & { profile: Profile | null }

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Administrateur',
  manager: 'Manager',
  director: 'Directeur',
  contributor: 'Contributeur',
  terrain: 'Terrain',
  reader: 'Lecteur',
}

export default function AdminMembers() {
  const { organisation } = useOrganisation()

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

  return (
    <div className="max-w-4xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Membres</h1>
            <p className="text-slate-500 text-sm mt-1">
              {members.length} membre{members.length > 1 ? 's' : ''} actif{members.length > 1 ? 's' : ''}
            </p>
          </div>
          <button className="btn-primary">
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
                      <span className="badge badge-brand">
                        {ROLE_LABELS[member.role] ?? member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${member.accepted_at ? 'badge-success' : 'badge-warning'}`}>
                        {member.accepted_at ? 'Actif' : 'Invitation envoyée'}
                      </span>
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
    </div>
  )
}
