import { useQuery } from '@tanstack/react-query'
import { PenLine, ArrowRight, ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { SignatureRequest } from '@/types/database'

interface SignatureRequestWithDoc extends SignatureRequest {
  documents: { title: string } | null
}

function useInboxPath() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/manager')) return '/manager/signatures'
  if (pathname.startsWith('/admin'))   return '/admin/signatures'
  if (pathname.startsWith('/direction')) return '/direction/signatures'
  return '/app/signatures'
}

export default function PendingSignaturesWidget() {
  const { user } = useAuth()
  const inboxTo = useInboxPath()

  const { data: pending = [] } = useQuery<SignatureRequestWithDoc[]>({
    queryKey: ['pending_signatures', user?.id],
    enabled: !!user,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('signature_requests')
        .select('*, documents(title)')
        .eq('recipient_id', user!.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return (data ?? []) as SignatureRequestWithDoc[]
    },
  })

  if (pending.length === 0) return null

  return (
    <div className="card border-l-4 border-l-amber-400">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PenLine className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-slate-700">
            {pending.length} document{pending.length > 1 ? 's' : ''} à signer
          </h3>
        </div>
        <Link to={inboxTo} className="flex items-center gap-0.5 text-xs text-brand-600 hover:text-brand-700 font-medium">
          Voir tout <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="space-y-2">
        {pending.map(req => (
          <Link
            key={req.id}
            to={`/sign/${req.token}`}
            className="flex items-center justify-between gap-3 px-3 py-2.5 bg-slate-50 hover:bg-amber-50 rounded-lg group transition-colors"
          >
            <p className="text-sm text-slate-700 truncate flex-1">
              {req.documents?.title ?? 'Document'}
            </p>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 shrink-0 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  )
}
