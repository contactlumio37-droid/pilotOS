import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Mail, Copy, RotateCcw, X, Plus, Check } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useOrganisation } from '@/hooks/useOrganisation'
import { useAuth } from '@/hooks/useAuth'
import PageHeader from '@/components/layout/PageHeader'

const ROLE_OPTIONS = [
  { value: 'admin',       label: 'Administrateur' },
  { value: 'manager',     label: 'Manager' },
  { value: 'director',    label: 'Directeur' },
  { value: 'contributor', label: 'Contributeur' },
  { value: 'terrain',     label: 'Terrain' },
  { value: 'reader',      label: 'Lecteur' },
]

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'En attente', cls: 'badge badge-brand' },
  accepted:  { label: 'Acceptée',   cls: 'badge badge-success' },
  expired:   { label: 'Expirée',    cls: 'badge badge-neutral' },
  cancelled: { label: 'Annulée',    cls: 'badge badge-danger' },
}

const MODE_LABELS: Record<string, string> = {
  manual:     'Manuel',
  csv_import: 'Import CSV',
  free:       'Libre',
  paid:       'Payant',
}

interface Invitation {
  id: string
  email: string
  role: string
  mode: string
  status: string
  token: string
  expires_at: string
  created_at: string
}

function invitationLink(token: string) {
  return `${window.location.origin}/invitation/${token}`
}

export default function Invitations() {
  const { organisation } = useOrganisation()
  const { user } = useAuth()
  const qc = useQueryClient()

  const [showModal, setShowModal] = useState(false)
  const [email, setEmail]         = useState('')
  const [role, setRole]           = useState('contributor')
  const [formErr, setFormErr]     = useState('')
  const [copied, setCopied]       = useState<string | null>(null)

  const { data: invitations = [], isLoading } = useQuery<Invitation[]>({
    queryKey: ['invitations', organisation?.id],
    enabled: !!organisation,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('organisation_id', organisation!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Invitation[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const { error } = await supabase.from('invitations').insert({
        organisation_id: organisation!.id,
        email,
        role,
        mode: 'manual',
        invited_by: user!.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invitations', organisation?.id] })
      setShowModal(false)
      setEmail('')
      setRole('contributor')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'cancelled' })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invitations', organisation?.id] }),
  })

  const resendMutation = useMutation({
    mutationFn: async (inv: Invitation) => {
      const { error } = await supabase.from('invitations').insert({
        organisation_id: inv.organisation_id ?? organisation!.id,
        email: inv.email,
        role: inv.role,
        mode: inv.mode,
        invited_by: user!.id,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invitations', organisation?.id] }),
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormErr('Email invalide.')
      return
    }
    setFormErr('')
    createMutation.mutate({ email: email.trim(), role })
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(invitationLink(token))
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Invitations"
        subtitle={`${invitations.length} invitation${invitations.length !== 1 ? 's' : ''}`}
        actions={
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus className="w-4 h-4" />
            Inviter manuellement
          </button>
        }
      />

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card animate-pulse h-14" />)}
        </div>
      )}

      {!isLoading && invitations.length === 0 && (
        <div className="card text-center py-12">
          <Mail className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="font-medium text-slate-500">Aucune invitation pour l'instant.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-4 text-sm">
            Envoyer une invitation
          </button>
        </div>
      )}

      {!isLoading && invitations.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Rôle</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Mode</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Expiration</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invitations.map(inv => {
                const badge = STATUS_BADGE[inv.status] ?? STATUS_BADGE.expired
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-700 truncate max-w-[180px]">{inv.email}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{inv.role}</td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{MODE_LABELS[inv.mode] ?? inv.mode}</td>
                    <td className="px-4 py-3"><span className={badge.cls}>{badge.label}</span></td>
                    <td className="px-4 py-3 text-slate-400 hidden md:table-cell text-xs">
                      {format(new Date(inv.expires_at), 'd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {inv.status === 'pending' && (
                          <>
                            <button
                              onClick={() => copyLink(inv.token)}
                              title="Copier le lien"
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-brand-600 transition-colors"
                            >
                              {copied === inv.token
                                ? <Check className="w-4 h-4 text-emerald-500" />
                                : <Copy className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => cancelMutation.mutate(inv.id)}
                              title="Annuler"
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {(inv.status === 'expired' || inv.status === 'cancelled') && (
                          <button
                            onClick={() => resendMutation.mutate(inv as Invitation & { organisation_id: string })}
                            title="Renvoyer"
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-brand-600 transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modale invitation manuelle */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">Inviter un membre</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createMutation.isError && (
              <div className="mb-3 bg-red-50 text-red-700 text-xs rounded-lg px-3 py-2">
                {(createMutation.error as Error).message}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="label">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input"
                  placeholder="alice@exemple.fr"
                />
                {formErr && <p className="text-xs text-danger mt-1">{formErr}</p>}
              </div>
              <div>
                <label className="label">Rôle *</label>
                <select value={role} onChange={e => setRole(e.target.value)} className="input">
                  {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Annuler
                </button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
                  {createMutation.isPending ? 'Envoi…' : 'Créer l\'invitation'}
                </button>
              </div>
            </form>

            {/* Affiche le lien après création réussie */}
            {createMutation.isSuccess && (
              <div className="mt-3 bg-brand-50 rounded-lg px-3 py-2 text-xs text-brand-700 break-all">
                Lien créé — copiez-le depuis le tableau.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
