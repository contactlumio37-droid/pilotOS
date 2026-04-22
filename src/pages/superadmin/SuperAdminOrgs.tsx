import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, Building2, Users, ChevronDown, UserCheck, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Organisation, Plan } from '@/types/database'

const PLAN_COLORS: Record<string, string> = {
  free:       'text-slate-400 bg-slate-700',
  team:       'text-blue-300 bg-blue-900',
  business:   'text-green-300 bg-green-900',
  pro:        'text-purple-300 bg-purple-900',
  enterprise: 'text-yellow-300 bg-yellow-900',
}

const PLANS: Plan[] = ['free', 'team', 'business', 'pro', 'enterprise']

interface OrgWithMemberCount extends Organisation {
  member_count?: number
}

function useUpdateOrgPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, plan }: { id: string; plan: Plan }) => {
      const { error } = await supabase
        .from('organisations')
        .update({ plan, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin_orgs'] }),
  })
}

function useToggleOrgActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('organisations')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin_orgs'] }),
  })
}

function useToggleAiEnabled() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ai_enabled }: { id: string; ai_enabled: boolean }) => {
      const { error } = await supabase
        .from('organisations')
        .update({ ai_enabled, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin_orgs'] }),
  })
}

function useEnsureOrgAccess() {
  return useMutation({
    mutationFn: async (organisationId: string) => {
      const { data, error } = await supabase.functions.invoke('ensure-org-access', {
        body: { organisation_id: organisationId },
      })
      if (error) throw error
      return data
    },
  })
}

export default function SuperAdminOrgs() {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const updatePlan      = useUpdateOrgPlan()
  const toggleActive    = useToggleOrgActive()
  const toggleAi        = useToggleAiEnabled()
  const ensureAccess    = useEnsureOrgAccess()

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['superadmin_orgs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organisations')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as OrgWithMemberCount[]
    },
  })

  const filtered = orgs.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.slug.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="max-w-5xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Organisations</h1>
          <span className="text-sm text-slate-400">{orgs.length} total</span>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Rechercher une organisation..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(org => (
              <div
                key={org.id}
                className={`bg-slate-800 rounded-xl border transition-colors ${
                  org.is_active ? 'border-slate-700' : 'border-red-900 opacity-70'
                }`}
              >
                {/* Row */}
                <div
                  className="flex items-center gap-4 px-6 py-4 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === org.id ? null : org.id)}
                >
                  <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{org.name}</p>
                    <p className="text-xs text-slate-500">{org.slug}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${PLAN_COLORS[org.plan]}`}>
                    {org.plan.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1 text-slate-400 text-sm shrink-0">
                    <Users className="w-3.5 h-3.5" />
                    <span>{org.seats_included + org.seats_extra}</span>
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">
                    {new Date(org.created_at).toLocaleDateString('fr-FR')}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform ${expandedId === org.id ? 'rotate-180' : ''}`}
                  />
                </div>

                {/* Expanded panel */}
                {expandedId === org.id && (
                  <div className="px-6 pb-4 pt-1 border-t border-slate-700 flex items-center gap-4 flex-wrap">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Plan</p>
                      <select
                        defaultValue={org.plan}
                        onChange={e => updatePlan.mutate({ id: org.id, plan: e.target.value as Plan })}
                        className="text-sm bg-slate-700 border border-slate-600 text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        {PLANS.map(p => (
                          <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-1">Sièges inclus</p>
                      <p className="text-sm text-white font-medium">
                        {org.seats_included} + {org.seats_extra} extra
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-1">Stripe</p>
                      <p className="text-xs font-mono text-slate-400">
                        {org.stripe_customer_id ?? '—'}
                      </p>
                    </div>

                    <div className="ml-auto flex items-center gap-2 flex-wrap">
                      {/* Toggle IA */}
                      <button
                        onClick={() => toggleAi.mutate({ id: org.id, ai_enabled: !org.ai_enabled })}
                        title={org.ai_enabled ? 'Désactiver l\'IA' : 'Activer l\'IA'}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          org.ai_enabled
                            ? 'border-brand-500 text-brand-400 bg-brand-900/20'
                            : 'border-slate-600 text-slate-500 hover:border-slate-500'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        IA {org.ai_enabled ? 'ON' : 'OFF'}
                      </button>

                      {/* Accès org (auto-provisioning) */}
                      <button
                        onClick={() => ensureAccess.mutate(org.id)}
                        disabled={ensureAccess.isPending}
                        title="Accéder à cette organisation en tant que superadmin"
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:border-brand-500 hover:text-brand-400 transition-colors"
                      >
                        <UserCheck className="w-3 h-3" />
                        Accéder
                      </button>

                      {/* Activer / désactiver org */}
                      <button
                        onClick={() => toggleActive.mutate({ id: org.id, is_active: !org.is_active })}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          org.is_active
                            ? 'border-red-700 text-red-400 hover:bg-red-900/30'
                            : 'border-green-700 text-green-400 hover:bg-green-900/30'
                        }`}
                      >
                        {org.is_active ? 'Désactiver' : 'Réactiver'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

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
