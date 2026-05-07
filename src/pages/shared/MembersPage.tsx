import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganisation } from '@/hooks/useOrganisation'
import type { OrganisationMember, Profile } from '@/types/database'

type MemberWithProfile = OrganisationMember & { profile: Profile | null }

const ROLE_LABELS: Record<string, string> = {
  superadmin:  'Super Admin',
  admin:       'Administrateur',
  director:    'Directeur',
  manager:     'Manager',
  contributor: 'Contributeur',
  terrain:     'Terrain',
  reader:      'Lecteur',
}

const ROLE_BADGE: Record<string, string> = {
  superadmin:  'badge-danger',
  admin:       'badge-brand',
  director:    'badge-brand',
  manager:     'badge-warning',
  contributor: 'badge-neutral',
  terrain:     'badge-neutral',
  reader:      'badge-neutral',
}

export default function MembersPage() {
  const { organisation } = useOrganisation()

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members-readonly', organisation?.id],
    enabled: !!organisation,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organisation_members')
        .select('*, profile:profiles(*)')
        .eq('organisation_id', organisation!.id)
        .eq('is_active', true)
        .order('role')
      if (error) throw error
      return data as MemberWithProfile[]
    },
  })

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-6 h-6 text-brand-600" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Membres</h1>
          <p className="text-sm text-slate-500">{members.length} membre{members.length > 1 ? 's' : ''} actif{members.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-16 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="card text-center py-12 text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Aucun membre actif dans cette organisation.</p>
        </div>
      ) : (
        <motion.ul
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
          className="space-y-2"
        >
          {members.map(m => (
            <motion.li
              key={m.id}
              variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
              className="card flex items-center gap-4 py-3 px-4"
            >
              <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0 text-sm font-bold text-brand-700">
                {(m.profile?.full_name ?? '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">
                  {m.profile?.full_name ?? 'Utilisateur inconnu'}
                </p>
              </div>
              <span className={`badge ${ROLE_BADGE[m.role] ?? 'badge-neutral'} shrink-0`}>
                {ROLE_LABELS[m.role] ?? m.role}
              </span>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  )
}
