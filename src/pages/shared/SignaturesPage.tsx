import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PenLine, CheckCircle2, XCircle, Clock, ArrowRight, Inbox } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import PageHeader from '@/components/layout/PageHeader'
import { useMySignatureRequests } from '@/hooks/useSignatures'
import type { SignatureRequest } from '@/types/database'

type Tab = 'pending' | 'done'

const STATUS_CONFIG: Record<SignatureRequest['status'], { label: string; icon: React.FC<{ className?: string }>; className: string }> = {
  pending:  { label: 'En attente', icon: Clock,         className: 'badge badge-warning' },
  signed:   { label: 'Signé',      icon: CheckCircle2,  className: 'badge badge-success' },
  rejected: { label: 'Refusé',     icon: XCircle,       className: 'badge badge-danger' },
}

export default function SignaturesPage() {
  const [tab, setTab] = useState<Tab>('pending')
  const { data: requests = [], isLoading } = useMySignatureRequests()

  const pending = requests.filter(r => r.status === 'pending' && new Date(r.expires_at) > new Date())
  const done    = requests.filter(r => r.status !== 'pending' || new Date(r.expires_at) <= new Date())

  const items = tab === 'pending' ? pending : done

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Signatures"
        subtitle="Documents en attente de votre signature"
      />

      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6 w-fit">
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          À signer
          {pending.length > 0 && (
            <span className="ml-1.5 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
              {pending.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('done')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === 'done' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Historique
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card text-center py-12">
          <Inbox className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="font-medium text-slate-500">
            {tab === 'pending' ? 'Aucun document en attente de signature.' : 'Aucune signature dans l\'historique.'}
          </p>
          {tab === 'pending' && (
            <p className="text-sm text-slate-400 mt-1">
              Vous recevrez une notification quand un document nécessite votre signature.
            </p>
          )}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {items.map(req => {
            const cfg = STATUS_CONFIG[req.status]
            const StatusIcon = cfg.icon
            const isExpired = new Date(req.expires_at) <= new Date()

            return (
              <div
                key={req.id}
                className={`card ${req.status === 'pending' && !isExpired ? 'border-l-4 border-l-amber-400' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <PenLine className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {(req.documents as { title: string } | null)?.title ?? 'Document'}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-slate-400">
                        Demandé par {(req.profiles as { full_name: string | null } | null)?.full_name ?? 'un responsable'}
                      </p>
                      <span className="text-xs text-slate-300">·</span>
                      <p className="text-xs text-slate-400">
                        {format(new Date(req.created_at), 'd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                    {req.message && (
                      <p className="text-xs text-slate-500 mt-1 italic">"{req.message}"</p>
                    )}
                    {req.status === 'pending' && !isExpired && (
                      <p className="text-xs text-amber-600 mt-1">
                        Expire le {format(new Date(req.expires_at), 'd MMM yyyy', { locale: fr })}
                      </p>
                    )}
                    {isExpired && req.status === 'pending' && (
                      <p className="text-xs text-slate-400 mt-1">Demande expirée</p>
                    )}
                    {req.signed_at && (
                      <p className="text-xs text-success-600 mt-1">
                        Signé le {format(new Date(req.signed_at), 'd MMM yyyy', { locale: fr })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`${cfg.className} text-xs flex items-center gap-1`}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                    {req.status === 'pending' && !isExpired && (
                      <Link
                        to={`/sign/${req.token}`}
                        className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        Signer <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
