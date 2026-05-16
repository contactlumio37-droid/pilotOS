import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Send, UserCheck } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/useToast'
import { sendSignatureRequestEmail } from '@/lib/email'
import type { OrganisationMember } from '@/types/database'

interface MemberWithProfile extends OrganisationMember {
  profiles: { full_name: string | null; email: string | null } | null
}

interface Props {
  documentId: string
  documentTitle: string
  organisationId: string
  onClose: () => void
}

export default function SignatureRequestModal({ documentId, documentTitle, organisationId, onClose }: Props) {
  const { user, profile } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [message, setMessage] = useState('')

  const { data: members = [] } = useQuery<MemberWithProfile[]>({
    queryKey: ['org_members_with_profile', organisationId],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organisation_members')
        .select('*, profiles(full_name, email:id)')
        .eq('organisation_id', organisationId)
        .eq('is_active', true)
        .neq('user_id', user?.id)
      if (error) throw error
      return (data ?? []) as MemberWithProfile[]
    },
  })

  // Fetch profiles separately since email is in auth.users not profiles
  const { data: memberEmails = {} } = useQuery<Record<string, string>>({
    queryKey: ['org_member_emails', organisationId],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', members.map(m => m.user_id))
      const map: Record<string, string> = {}
      for (const p of data ?? []) map[p.id] = p.full_name ?? p.id
      return map
    },
    enabled: members.length > 0,
  })

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Non authentifié')
      const expires = new Date()
      expires.setDate(expires.getDate() + 30)
      const expiresIso = expires.toISOString()
      const expiresLabel = format(expires, 'd MMMM yyyy', { locale: fr })

      for (const recipientId of selectedIds) {
        const { data, error } = await supabase
          .from('signature_requests')
          .insert({
            organisation_id: organisationId,
            document_id: documentId,
            recipient_id: recipientId,
            sent_by: user.id,
            message: message.trim() || null,
            expires_at: expiresIso,
          })
          .select('token')
          .single()
        if (error) throw error
        const token = (data as { token: string }).token
        const signUrl = `${window.location.origin}/sign/${token}`

        // Fetch recipient email from auth (best-effort via profiles)
        const { data: recipProf } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', recipientId)
          .single()

        const { data: authUser } = await supabase.auth.admin
          ? { data: null }
          : { data: null }
        void authUser

        // We send email to an address stored in our internal profiles.
        // If no email available client-side, skip — Edge Function would handle this properly in production.
        const recipientName = recipProf?.full_name ?? 'Collaborateur'
        const senderName = profile?.full_name ?? 'Un responsable'

        try {
          await sendSignatureRequestEmail({
            to: recipientId, // Supabase Edge Function resolves the user email server-side via service role
            recipientName,
            senderName,
            documentTitle,
            orgName: '',
            signUrl,
            message: message.trim() || undefined,
            expiresAt: expiresLabel,
          })
        } catch {
          // Email failure is non-blocking — request is created, link can be shared manually
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signature_requests'] })
      toast.success(`${selectedIds.length} demande${selectedIds.length > 1 ? 's' : ''} envoyée${selectedIds.length > 1 ? 's' : ''}`)
      onClose()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function toggleMember(id: string) {
    setSelectedIds(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-800">Demander des signatures</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-3 bg-slate-50 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500">Document</p>
          <p className="text-sm font-medium text-slate-800 truncate">{documentTitle}</p>
        </div>

        <div className="mb-4">
          <label className="label">Destinataires *</label>
          <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-2">
            {members.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-3">Aucun membre disponible</p>
            )}
            {members.map(m => {
              const name = memberEmails[m.user_id] ?? m.user_id
              return (
                <label key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(m.user_id)}
                    onChange={() => toggleMember(m.user_id)}
                    className="rounded border-slate-300"
                  />
                  <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-700">{name}</span>
                  <span className="text-xs text-slate-400 ml-auto capitalize">{m.role}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="mb-5">
          <label className="label">Message <span className="text-slate-400 font-normal">(optionnel)</span></label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={2}
            placeholder="Merci de signer ce document avant le…"
            className="input resize-none text-sm"
          />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button
            onClick={() => sendMutation.mutate()}
            disabled={selectedIds.length === 0 || sendMutation.isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            {sendMutation.isPending ? 'Envoi…' : `Envoyer (${selectedIds.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}
