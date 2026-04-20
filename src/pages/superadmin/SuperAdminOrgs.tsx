import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, Building2 } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Organisation } from '@/types/database'

const PLAN_COLORS: Record<string, string> = {
  free: 'text-slate-400 bg-slate-700',
  team: 'text-blue-300 bg-blue-900',
  business: 'text-green-300 bg-green-900',
  pro: 'text-purple-300 bg-purple-900',
  enterprise: 'text-yellow-300 bg-yellow-900',
}

export default function SuperAdminOrgs() {
  const [search, setSearch] = useState('')

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['superadmin_orgs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organisations')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Organisation[]
    },
  })

  const filtered = orgs.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.slug.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="max-w-5xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h1 className="text-2xl font-bold text-white mb-6">Organisations</h1>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Rechercher une organisation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-slate-700">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3">
                    Organisation
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3">
                    Plan
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3">
                    Sièges
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3">
                    Créée
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filtered.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-700/50 transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-4 h-4 text-slate-500" />
                        <div>
                          <p className="font-medium text-white">{org.name}</p>
                          <p className="text-xs text-slate-500">{org.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${PLAN_COLORS[org.plan]}`}>
                        {org.plan.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300 text-sm">
                      {org.seats_included + org.seats_extra}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {new Date(org.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                Aucune organisation trouvée.
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}
