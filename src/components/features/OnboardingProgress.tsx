import { CheckCircle2, Circle, X } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

const STEPS = [
  { id: 'org',        label: 'Organisation créée',          check: () => true },
  { id: 'profile',    label: 'Profil complété',              check: () => false },
  { id: 'member',     label: 'Premier membre invité',        check: () => false },
  { id: 'action',     label: 'Première action créée',        check: () => false },
  { id: 'document',   label: 'Premier document déposé',      check: () => false },
]

function useOnboardingData(orgId: string | null) {
  return useQuery({
    queryKey: ['onboarding_progress', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      if (!orgId) return null
      const [members, actions, documents] = await Promise.all([
        supabase.from('organisation_members').select('id', { count: 'exact', head: true })
          .eq('organisation_id', orgId).eq('is_active', true),
        supabase.from('actions').select('id', { count: 'exact', head: true })
          .eq('organisation_id', orgId),
        supabase.from('documents').select('id', { count: 'exact', head: true })
          .eq('organisation_id', orgId),
      ])
      return {
        memberCount: members.count ?? 0,
        actionCount: actions.count ?? 0,
        documentCount: documents.count ?? 0,
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

const DISMISSED_KEY = 'pilotos_onboarding_progress_dismissed'

interface Props {
  organisationId: string
}

export default function OnboardingProgress({ organisationId }: Props) {
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(DISMISSED_KEY))
  const { data } = useOnboardingData(organisationId)

  if (dismissed || !user) return null

  const checks = [
    true,
    !!user.user_metadata?.full_name,
    (data?.memberCount ?? 0) > 1,
    (data?.actionCount ?? 0) > 0,
    (data?.documentCount ?? 0) > 0,
  ]
  const done = checks.filter(Boolean).length
  const total = checks.length

  if (done === total) {
    localStorage.setItem(DISMISSED_KEY, '1')
    return null
  }

  const percent = Math.round((done / total) * 100)

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="card mb-6 relative"
      >
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          title="Masquer"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="text-2xl">🚀</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">Démarrage — {done}/{total} étapes</p>
            <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-brand-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          {STEPS.map((step, i) => (
            <div key={step.id} className="flex items-center gap-2.5">
              {checks[i]
                ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                : <Circle className="w-4 h-4 text-slate-300 shrink-0" />}
              <span className={`text-sm ${checks[i] ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
