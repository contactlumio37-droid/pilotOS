import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Search, Users } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { UserRole } from '@/types/database'

interface UserRow {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  org_name: string
  org_id: string
  created_at: string
  is_active: boolean
}

const ROLE_BADGE: Record<UserRole, string> = {
  superadmin:  'badge-danger',
  admin:       'badge-brand',
  director:    'badge-brand',
  manager:     'badge-success',
  contributor: 'badge-neutral',
  reader:      'badge-neutral',
  terrain:     'badge-neutral',
}

function useAllUsers() {
  return useQuery({
    queryKey: ['superadmin_users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organisation_members')
        .select(`
          user_id, role, is_active, created_at,
          profiles!inner(id, full_name),
          organisations!inner(id, name)
        `)
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw error

      return (data ?? []).map(m => {
        const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
        const org = Array.isArray(m.organisations) ? m.organisations[0] : m.organisations
        return {
          id:         m.user_id,
          email:      '',
          full_name:  (profile as { full_name: string | null } | null)?.full_name ?? null,
          role:       m.role as UserRole,
          org_name:   (org as { name: string } | null)?.name ?? '—',
          org_id:     (org as { id: string } | null)?.id ?? '',
          created_at: m.created_at,
          is_active:  m.is_active,
        } as UserRow
      })
    },
  })
}

export default function SuperAdminUsers() {
  const { data: users = [], isLoading } = useAllUsers()
  const [search, setSearch] = useState('')

  const filtered = users.filter(u =>
    !search ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.org_name.toLowerCase().includes(search.toLowerCase()) ||
    u.role.includes(search.toLowerCase()),
  )

  const total   = users.length
  const active  = users.filter(u => u.is_active).length
  const admins  = users.filter(u => ['admin', 'director', 'manager'].includes(u.role)).length

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-white mb-1">Utilisateurs</h1>
      <p className="text-slate-400 text-sm mb-6">Vue globale de tous les membres</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total membres', value: total },
          { label: 'Actifs', value: active },
          { label: 'Managers+', value: admins },
        ].map(s => (
          <div key={s.label} className="bg-slate-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom, org ou rôle…"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
        />
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-800 animate-pulse rounded-xl h-14" />
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="space-y-1">
          {filtered.length === 0 && (
            <div className="bg-slate-800 rounded-xl p-8 text-center">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">Aucun résultat</p>
            </div>
          )}
          {filtered.map((u, i) => (
            <motion.div
              key={`${u.id}-${u.org_id}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="bg-slate-800 rounded-xl px-4 py-3 flex items-center gap-4"
            >
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-slate-300">
                  {(u.full_name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{u.full_name ?? '—'}</p>
                <p className="text-xs text-slate-400 truncate">{u.org_name}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`badge ${ROLE_BADGE[u.role]} text-xs`}>{u.role}</span>
                {!u.is_active && <span className="badge badge-neutral text-xs">inactif</span>}
                <span className="text-xs text-slate-500 hidden sm:block">
                  {format(new Date(u.created_at), 'd MMM yy', { locale: fr })}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
